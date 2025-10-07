import './Admin.css';
import { useState, useEffect } from 'react';
import NavBar from '../../components/NavBar/NavBar.tsx';
import { db } from '../../../Backend/firebase/firebaseConfig.ts';
import { collection, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';

interface User {
  id: string;
  email: string;
  role: string;
  balance: number;
}

export default function Admin() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const usersCollectionRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersCollectionRef, (querySnapshot) => {
      const usersData = querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as User
      );
      setUsers(usersData);
    });

    return () => unsubscribe();
  }, []);

  // --- Database Action Functions ---

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      const userDoc = doc(db, 'users', id);
      await deleteDoc(userDoc);
    }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    const userDoc = doc(db, 'users', id);
    await updateDoc(userDoc, { role: newRole });
  };

  const handleBalanceEdit = async (id: string, currentBalance: number) => {
    const newBalanceStr = prompt('Enter the new balance:', currentBalance.toString());

    // Proceed only if the user entered something
    if (newBalanceStr !== null) {
      const newBalance = parseFloat(newBalanceStr);

      // Validate that the input is a valid number
      if (!isNaN(newBalance)) {
        const userDoc = doc(db, 'users', id);
        await updateDoc(userDoc, { balance: newBalance });
      } else {
        alert('Invalid input. Please enter a valid number for the balance.');
      }
    }
  };

  return (
    <>
      <NavBar />
      <div className='userTableContainer'>
        <h2>User Management</h2>
        <table className='userTable'>
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Role</th>
              <th>Balance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.email}</td>
                <td>
                  <select
                    className='roleDropdown'
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  >
                    <option value='user'>User</option>
                    <option value='staff'>Staff</option>
                    <option value='admin'>Admin</option>
                  </select>
                </td>
                <td>${user.balance.toFixed(2)}</td>
                <td>
                  {/* Edit button for balance changes */}
                  <button
                    onClick={() => handleBalanceEdit(user.id, user.balance)}
                    className='editButton'
                  >
                    Edit
                  </button>
                  <button onClick={() => handleDelete(user.id)} className='deleteButton'>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
