import './Admin.css';
import { useState, useEffect } from 'react';
import NavBar from '../../components/NavBar/NavBar.tsx';
import { db } from '../../../Backend/firebase/firebaseConfig.ts';
import { collection, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useUser } from '../../../Backend/firebase/UserFunctions.tsx';

interface User {
  id: string;
  email: string;
  roles: string[];
  balance: number;
}

export default function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const { user: currentUser } = useUser();

  useEffect(() => {
    const usersCollectionRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersCollectionRef, (querySnapshot) => {
      const usersData = querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
            roles: doc.data().roles || [],
          }) as User
      );
      setUsers(usersData);
    });

    return () => unsubscribe();
  }, []);

  // --- Database Action Functions ---

  const handleRolesChange = async (
    id: string,
    role: string,
    isChecked: boolean,
    currentRoles: string[]
  ) => {
    let newRoles = [...currentRoles];
    if (isChecked) {
      // Add the role if it's not already there
      if (!newRoles.includes(role)) {
        newRoles.push(role);
      }
    } else {
      // Remove the role
      newRoles = newRoles.filter((r) => r !== role);
    }

    const userDoc = doc(db, 'users', id);
    await updateDoc(userDoc, { roles: newRoles });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      const userDoc = doc(db, 'users', id);
      await deleteDoc(userDoc);
    }
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
                <td className='roles-checkboxes'>
                  <label>
                    <input
                      type='checkbox'
                      checked={user.roles.includes('admin')}
                      onChange={(e) =>
                        handleRolesChange(user.id, 'admin', e.target.checked, user.roles)
                      }
                    />
                    Admin
                  </label>
                  <label>
                    <input
                      type='checkbox'
                      checked={user.roles.includes('staff')}
                      onChange={(e) =>
                        handleRolesChange(user.id, 'staff', e.target.checked, user.roles)
                      }
                    />
                    Staff
                  </label>
                </td>
                <td>${user.balance.toFixed(2)}</td>
                <td>
                  <button
                    onClick={() => handleBalanceEdit(user.id, user.balance)}
                    className='editButton'
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className='deleteButton'
                    disabled={currentUser?.uid === user.id}
                  >
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
