import React, { useState, useEffect } from "react";
import { API, graphqlOperation } from "aws-amplify";
import { withAuthenticator } from "aws-amplify-react";
import { createNote, deleteNote, updateNote } from "./graphql/mutations";
import { listNotes } from "./graphql/queries";
import {
  onCreateNote,
  onDeleteNote,
  onUpdateNote
} from "./graphql/subscriptions";

const App = (props) => {
  const [id, setId] = useState("");
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    const {
      attributes: { sub }
    } = props.authData;
    getNotes();
    const createNoteListener = API.graphql(
      graphqlOperation(onCreateNote, { owner: sub })
    ).subscribe({
      next: noteData => {
        const newNote = noteData.value.data.onCreateNote;
        setNotes(prevNotes => {
          const oldNotes = prevNotes.filter(note => note.id !== newNote.id);
          const updatedNotes = [...oldNotes, newNote];
          return updatedNotes;
        });
        setNote("");
      }
    });

    const deleteNoteListener = API.graphql(
      graphqlOperation(onDeleteNote, { owner: sub })
    ).subscribe({
      next: noteData => {
        const deletedNote = noteData.value.data.onDeleteNote;
        setNotes(prevNotes => {
          const updatedNotes = prevNotes.filter(
            note => note.id !== deletedNote.id
          );
          return updatedNotes;
        });
      }
    });

    const updateNoteListener = API.graphql(
      graphqlOperation(onUpdateNote, { owner: sub })
    ).subscribe({
      next: noteData => {
        const updatedNote = noteData.value.data.onUpdateNote;
        setNotes(prevNotes => {
          const index = prevNotes.findIndex(note => note.id === updatedNote.id);
          const updatedNotes = [
            ...prevNotes.slice(0, index),
            updatedNote,
            ...prevNotes.slice(index + 1)
          ];
          return updatedNotes;
        });
        setId("");
        setNote("");
      }
    });

    return () => {
      createNoteListener.unsubscribe();
      deleteNoteListener.unsubscribe();
      updateNoteListener.unsubscribe();
    };
  }, [notes, props.authData]);

  const getNotes = async () => {
    const result = await API.graphql(graphqlOperation(listNotes));
    setNotes(result.data.listNotes.items);
  };

  const handleAddNote = async event => {
    event.preventDefault();
    if (hasExistingNote()) {
      handleUpdateNote();
    } else {
      const input = { note };
      await API.graphql(graphqlOperation(createNote, { input }));
    }
  };

  const handleChangeNote = event => {
    setNote(event.target.value);
  };

  const handleDeleteNote = async noteId => {
    const input = { id: noteId };
    await API.graphql(graphqlOperation(deleteNote, { input }));
  };

  const handleSetNote = ({ note, id }) => {
    setId(id);
    setNote(note);
  };

  const handleUpdateNote = async () => {
    const input = { id, note };
    await API.graphql(graphqlOperation(updateNote, { input }));
  };

  const hasExistingNote = () => {
    if (id) {
      const isNote = notes.findIndex(note => note.id === id) > -1;
      return isNote;
    }
    return false;
  };

  return (
    <div className="flex flex-column items-center justify-center pa3 bg-washed-red">
      <h1 className="code f2-l">Amplify Notetaker</h1>
      {/*Note form*/}
      <form className="mb3" onSubmit={handleAddNote}>
        <input
          type="text"
          className="pa2 f4"
          placeholder="write your note"
          onChange={handleChangeNote}
          value={note}
        />
        <button className="pa2 f4" type="submit">
          {id ? "Update note" : "Add note"}
        </button>
      </form>

      {/* notes list */}

      {notes.map(item => (
        <div key={item.id} className="flex items-center">
          <li onClick={() => handleSetNote(item)} className="list pa1 f3">
            {item.note}
          </li>
          <button
            onClick={() => handleDeleteNote(item.id)}
            className="bg-transparent bn f4"
          >
            <span>&times;</span>
          </button>
        </div>
      ))}
    </div>
  );
};

export default withAuthenticator(App, { includeGreetings: true });
