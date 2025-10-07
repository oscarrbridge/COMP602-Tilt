import './Admin.css'
import NavBar from '../../components/NavBar/NavBar.tsx'

const mockUsers = [
    { id: '1', email: 'user1@example.com', role: 'user', balance: 150.50 },
    { id: '2', email: 'user2@example.com', role: 'staff', balance: 89.25 },
    { id: '3', email: 'admin@example.com', role: 'admin', balance: 500.00 },
    { id: '4', email: 'user3@example.com', role: 'user', balance: 22.75 },
    { id: '5', email: 'staff@example.com', role: 'staff', balance: 200.00 },
];

export default function Admin()
{
    return(
        <>
            <NavBar />
                <div className="userTableContainer">
                    <h2>User Management</h2>
                    <table className="userTable">
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
                            {mockUsers.map(user => (
                                <tr key={user.id}>
                                    <td>{user.id}</td>
                                    <td>{user.email}</td>
                                    <td>{user.role}</td>
                                    <td>${user.balance.toFixed(2)}</td>
                                    <td>
                                        <button className="editButton">Edit</button>
                                        <button className="deleteButton">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
        </>
    );
} 