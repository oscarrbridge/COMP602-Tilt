import './Friends.css';
import NavBar from '../../components/NavBar/NavBar.tsx';
import { useFriends } from '../../components/Friends/friends.tsx';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useUser } from '@backend/firebase/UserFunctions.tsx';
import { db } from '../../../Backend/firebase/firebaseConfig';
import { getDoc } from 'firebase/firestore';
import Footer from "@components/Footer/footer";


// Component to show accepted friends
function FriendsList({ friends, removeFriend }) {
  return (
    <div style={{ padding: '20px' }}>
      {friends.length === 0 ? (
        <p>You don't have any friends yet.</p>
      ) : (
        <>
          <h3> Friends List</h3>
          <ul>
            {friends.map((friend) => (
              <li
                key={friend.uid}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                  paddingRight: '5px',
                }}
              >
                <span>{friend.username || friend.email}</span>
                <button
                  onClick={() => removeFriend(friend.uid)}
                  style={{
                    marginLeft: '15px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    backgroundColor: 'transparent',
                    color: 'red',
                    border: '1px solid red',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                  }}
                >
                  X
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// Component to show pending requests and accept/decline buttons
function FriendRequests({ pendingRequests, acceptFriendRequest, sendFriendRequest }) {
  const { user } = useUser();
  const currentUid = user?.uid;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    if (feedbackMessage) {
      const timer = setTimeout(() => setFeedbackMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);

  const handleSearch = async () => {
    const queryTerm = searchQuery.trim().toLowerCase();

    setHasSearched(true);

    if (!queryTerm) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    let results = [];
    try {
      const usersRef = collection(db, 'users'); // --- Query by Email (Exact Match) ---

      const emailQuery = query(usersRef, where('email', '==', queryTerm));
      const emailSnapshot = await getDocs(emailQuery);

      emailSnapshot.docs.forEach((doc) => {
        results.push({
          uid: doc.id,
          ...doc.data(),
          email: doc.data().email,
          username: doc.data().username,
          name: doc.data().name,
        });
      }); // --- Query by Username (Exact Match) ---

      const usernameQuery = query(usersRef, where('username', '==', queryTerm));
      const usernameSnapshot = await getDocs(usernameQuery);

      usernameSnapshot.docs.forEach((doc) => {
        const userData = {
          uid: doc.id,
          ...doc.data(),
          email: doc.data().email,
          name: doc.data().name,
        };
        if (!results.some((u) => u.uid === userData.uid)) {
          results.push(userData);
        }
      });

      const finalResults = results.filter(
        (u) => u.uid !== currentUid && !u.private // Exclude self and private users
      );

      setSearchResults(finalResults);
    } catch (error) {
      console.error('Firestore search failed:', error);
      setSearchResults([]);
    }

    setIsSearching(false);
  };

  const handleSendClick = async (recipientUid: string, recipientName: string) => {
    try {
      await sendFriendRequest(recipientUid);
      setFeedbackMessage(`Request sent to ${recipientName || 'user'}!`);
      setSearchResults([]);
      setSearchQuery('');
      setHasSearched(false);
    } catch (error) {
      setFeedbackMessage('Error: Failed to send request.');
    }
  };

  // [NEW_FUNCTION]: Handles clicking 'Accept' button with feedback and removal from list
  const handleAcceptClick = async (senderUid: string, senderName: string) => {
    try {
      await acceptFriendRequest(senderUid);
      // Success: The item will disappear instantly via onSnapshot listener.
      setFeedbackMessage(`${senderName || 'user'} is now your friend!`);
    } catch (error) {
      setFeedbackMessage('Error: Failed to accept request. Check console/rules.');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      {feedbackMessage && (
        <div
          style={{
            padding: '10px',
            backgroundColor: feedbackMessage.startsWith('Error') ? '#f44336' : '#4caf50',
            color: 'white',
            borderRadius: '5px',
            marginBottom: '15px',
          }}
        >
          {feedbackMessage}
        </div>
      )}
      {/* INCOMING REQUESTS SECTION*/}
      <h3>Incoming Requests ({pendingRequests.length})</h3>
      {pendingRequests.length === 0 ? (
        <p>No pending friend requests.</p>
      ) : (
        <ul>
          {pendingRequests.map((request) => (
            <li
              key={request.id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>
                From:
                {request.senderUsername ||
                  request.senderEmail ||
                  request.senderId.substring(0, 8) + '...'}
              </span>
              <button
                // [FIX]: Call the new wrapper function
                onClick={() =>
                  handleAcceptClick(request.senderId, request.senderUsername || request.senderEmail)
                }
                style={{ marginLeft: '10px' }}
              >
                Accept
              </button>
            </li>
          ))}
        </ul>
      )}
      <br /> {/* SEARCH SECTION */} <h3>Find Friends</h3>
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type='text'
          placeholder='Enter email or username...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: '8px', flexGrow: 1 }}
        />

        <button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>
      {/* Search Results Display */}
      <div style={{ marginTop: '15px' }}>
        {/* 1. Show Loading State */}
        {isSearching ? (
          <p>Loading results...</p>
        ) : /* 2. Show Results/Error ONLY if search was attempted */
        hasSearched ? (
          searchResults.length > 0 ? (
            /* 2a. Show Results List */
            <ul>
              {searchResults.map((user) => (
                <li
                  key={user.uid}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span>
                    {user.username} ({user.email})
                  </span>

                  <button onClick={() => handleSendClick(user.uid, user.username || user.email)}>
                    Add Friend
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            /* 2b. Show 'No Users Found' Message (Search attempted, results empty) */
            <p>No users found. Try searching by email or username.</p>
          )
        ) : /* 3. Initial State: Show Nothing (Blank) */
        null}
      </div>
    </div>
  );
}

export default function Friends() {
  // Get state and functions from the custom hook
  const { friends, pendingRequests, acceptFriendRequest, sendFriendRequest, removeFriend } =
    useFriends();
  return (
    <>
      <NavBar />
      <div className='FriendsContainer'>
        <div className='FriendsComponent'>
          <h2>My Friends</h2> {/* Pass the list of accepted friends */}
          <FriendsList friends={friends} removeFriend={removeFriend} />
        </div>

        <div className='FriendsComponent'>
          <h2>Requests & Search</h2>
          {/* Pass the incoming requests and the acceptance function */}
          <FriendRequests
            pendingRequests={pendingRequests}
            acceptFriendRequest={acceptFriendRequest}
            sendFriendRequest={sendFriendRequest} // Pass send function for search/add feature
          />
        </div>
      </div>
      <Footer />
    </>
  );
}
