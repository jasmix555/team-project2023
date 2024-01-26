import { FormEvent, useEffect, useRef, useState } from "react";
import {
  getDatabase,
  onChildAdded,
  push,
  ref,
  serverTimestamp,
  get,
  onValue,
} from "@firebase/database";
import { FirebaseError } from "@firebase/util";
import { AuthGuard } from "@/feature/auth/component/AuthGuard/AuthGuard";
import {
  doc,
  getDoc,
  getFirestore,
  collection,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { getAuth, User } from "firebase/auth";
import { FaUsers, FaXmark } from "react-icons/fa6";
import { PiBookBookmark, PiBookBookmarkFill } from "react-icons/pi";
import { BsSend } from "react-icons/bs";
import { format, intervalToDuration } from "date-fns";
import { useRouter } from "next/router";
import style from "@/styles/groupChat.module.scss";
import LayoutPage from "@/component/LayoutPage";
import Image from "next/image";
import { usePresence } from "@/component/presenceUtils";
import LinkBox from "@/component/LinkBox";
import { AiFillHome } from "react-icons/ai";
import { formatRemainingTime } from "@/utils/formatTime";
import { FaSave } from "react-icons/fa";

export type MessageProps = {
  message: string;
  userId: string;
  userNickname: string;
  timestamp: number;
  character: number;
  messageKey: string;
};

type DictionaryItem = {
  message: string;
  timestamp: number;
  saved: boolean;
  word?: string;
  messageKey: string;
};

const Message = ({
  message,
  userNickname,
  timestamp,
  character,
  userId,
  messageKey,
}: MessageProps) => {
  const formattedTimestamp = format(new Date(timestamp), "HH:mm");
  const auth = getAuth();
  const user = auth.currentUser;
  const isCurrentUser = userId === user?.uid;
  const [isInteracted, setIsInteracted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [editedMessage, setEditedMessage] = useState(message);
  const [editedMessageKey, setEditedMessageKey] = useState(messageKey);

  useEffect(() => {
    const checkIfMessageSaved = async () => {
      try {
        if (!user) {
          return;
        }

        const db = getFirestore();
        const usersCollection = collection(db, "users");
        const userDocRef = doc(usersCollection, user.uid);

        const userData = (await getDoc(userDocRef)).data();
        const existingMessages: DictionaryItem[] = userData?.dictionary || [];

        const savedMessage = existingMessages.find(
          (existingMessage) => existingMessage.message === message
        );

        if (savedMessage) {
          setIsBookmarked(savedMessage.saved);
        }
      } catch (error) {
        console.error("Error checking if message is saved:", error);
      }
    };

    checkIfMessageSaved();
  }, [user, message]);

  const handleBookmarkClick = () => {
    setIsInteracted(true);
    setEditedMessageKey(Math.random().toString(36));
  };

  const handleSaveEditedMessage = async () => {
    try {
      if (!user) {
        return;
      }

      const db = getFirestore();
      const usersCollection = collection(db, "users");
      const userDocRef = doc(usersCollection, user.uid);

      const dictionaryItem: DictionaryItem = {
        word: editedMessage,
        message: editedMessage,
        timestamp,
        saved: true,
        messageKey: editedMessageKey,
      };

      await updateDoc(userDocRef, {
        dictionary: arrayUnion(dictionaryItem),
      });

      setIsBookmarked(true);
      setIsInteracted(false);
      console.log("Edited message saved to dictionary!");
    } catch (error) {
      console.error("Error saving edited message to dictionary:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditedMessage(message);
    setIsInteracted(false);
    setEditedMessageKey(messageKey);
  };

  // New function to handle opening the modal
  const handleOpenModal = () => {
    setIsInteracted(true);
    setEditedMessageKey(messageKey);
  };

  return (
    <div className={isCurrentUser ? style.messageWrapUser : style.messageWrap}>
      {isCurrentUser ? (
        <>
          <div className={style.wrapper}>
            <div className={style.timestamp}>
              <p>{formattedTimestamp} </p>
            </div>
            <div className={style.messageContentWrap}>
              <div className={style.message}>{message}</div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className={style.avatarWrap}>
            <div className={style.avatar}>
              <Image
                src={`/characters/${character}.svg`}
                alt={`UserCharacter ${character}`}
                width={50}
                height={50}
                priority
              />
            </div>
            <p>{userNickname}</p>
          </div>
          <div className={style.wrapper}>
            <div className={style.messageContentWrap}>
              {isInteracted ? (
                <div className={style.interactedMessage}>
                  <div className={style.message}>{message}</div>
                  <div className={style.actions}>
                    <button onClick={handleCancelEdit}>
                      <FaXmark />
                    </button>
                    <button onClick={handleSaveEditedMessage}>
                      <FaSave />
                    </button>
                  </div>
                </div>
              ) : (
                <div className={style.message}>{message}</div>
              )}
            </div>
            <div className={style.timestamp}>
              <div className={style.bookmark}>
                {isInteracted && (
                  <div className={style.interacted}>
                    <button onClick={handleCancelEdit}>
                      <FaXmark />
                    </button>
                    <button onClick={handleSaveEditedMessage}>
                      <FaSave />
                    </button>
                  </div>
                )}
                {!isInteracted && (
                  <button onClick={handleOpenModal}>
                    {isBookmarked ? <PiBookBookmarkFill /> : <PiBookBookmark />}
                  </button>
                )}
              </div>
              <p>{formattedTimestamp} </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const GroupChat = () => {
  const messagesElementRef = useRef<HTMLDivElement | null>(null);
  const [message, setMessage] = useState<string>("");
  const [nickname, setNickname] = useState<string>("");
  const [groupInfo, setGroupInfo] = useState({ title: "", expirationTime: "" });
  const [userCharacter, setUserCharacter] = useState<number>(1);
  const auth = getAuth();
  const user: User | null = auth.currentUser;
  const router = useRouter();
  const { groupId, planet } = router.query;
  const [dictionary, setDictionary] = useState<DictionaryItem[]>([]);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const [chats, setChats] = useState<MessageProps[]>([]);
  const [countdown, setCountdown] = useState<Duration | null>(null);
  const [userCount, setUserCount] = useState(0);

  usePresence(groupId as string);

  const fetchGroupInfoAndUserData = async () => {
    try {
      // Fetch group information
      const groupDocRef = doc(
        collection(getFirestore(), "planets", planet as string, "groups"),
        groupId as string
      );
      const groupDocSnapshot = await getDoc(groupDocRef);

      if (groupDocSnapshot.exists()) {
        const groupData = groupDocSnapshot.data();
        const expirationTime = groupData.expirationTime?.toDate();
        const formattedExpirationTime = expirationTime
          ? format(expirationTime, "yyyy-MM-dd HH:mm:ss")
          : "";

        setGroupInfo({
          title: groupData.title,
          expirationTime: formattedExpirationTime,
        });
      } else {
        console.log("Group not found.");
      }

      // Fetch user data
      const user: User | null = auth.currentUser;
      const userDocRef = doc(collection(getFirestore(), "users"), user?.uid);
      const userData = (await getDoc(userDocRef)).data();

      if (userData) {
        setNickname(userData.nickname);
        setUserCharacter(userData.character);
        setDictionary(userData.dictionary || []); // Assuming dictionary is an array
      }
    } catch (error) {
      console.error("Error fetching group information or user data:", error);
    }
  };

  useEffect(() => {
    fetchGroupInfoAndUserData();
  }, [groupId, user]);

  useEffect(() => {
    try {
      const db = getDatabase();
      const dbRef = ref(db, `groupChatMessages/${groupId}`);

      const onNewMessage = (snapshot: any) => {
        const message = String(snapshot.val()["message"] ?? "");
        const userId = String(snapshot.val()["userId"] ?? "");
        const userNickname = String(snapshot.val()["userNickname"] ?? "");
        const timestamp = Number(snapshot.val()["timestamp"] ?? 0);
        const character = Number(snapshot.val()["character"] ?? 1);
        const messageKey = snapshot.key; // Use the message key from Firebase as a unique identifier

        // Check if the message already exists in the state
        const isMessageExists = chats.some(
          (chat) => chat.messageKey === messageKey
        );

        if (!isMessageExists) {
          setChats((prev) => [
            ...prev,
            { message, userId, userNickname, timestamp, character, messageKey },
          ]);

          // Scroll to the bottom when a new message is added
          setTimeout(() => {
            chatBottomRef.current?.scrollTo({
              top: chatBottomRef.current?.scrollHeight,
            });
          }, 0);
        }
      };

      const unsubscribe = onChildAdded(dbRef, onNewMessage);

      return () => {
        unsubscribe();
      };
    } catch (e) {
      if (e instanceof FirebaseError) {
        console.error(e);
      }
    }
  }, [groupId, chats]);

  useEffect(() => {
    const calculateCountdown = () => {
      if (groupInfo.expirationTime) {
        const now = new Date();
        const expirationTime = new Date(groupInfo.expirationTime);

        if (now >= expirationTime) {
          // Set the countdown to null when the current time is greater than or equal to the expiration time
          setCountdown(null);
        } else {
          const remainingTime = intervalToDuration({
            start: now,
            end: expirationTime,
          });

          // Set the countdown only if there is remaining time
          setCountdown(remainingTime);
        }
      }
    };

    // Calculate initially and then set up interval for continuous updates
    calculateCountdown();

    const intervalId = setInterval(calculateCountdown, 1000); // Update every second

    return () => clearInterval(intervalId); // Cleanup on component unmount
  }, [groupInfo.expirationTime]);

  useEffect(() => {
    const fetchUserCount = () => {
      if (groupId) {
        try {
          const db = getDatabase();
          const groupChatUsersRef = ref(db, `groupChatUsers/${groupId}`);

          // Fetch the data once to get an initial count
          get(groupChatUsersRef).then((snapshot) => {
            const count = Object.keys(snapshot.val() || {}).length;
            setUserCount(count);
          });

          // Use onValue to listen for changes in the user count and presence
          return onValue(groupChatUsersRef, (snapshot) => {
            const count = Object.keys(snapshot.val() || {}).length;
            setUserCount(count);
          });
        } catch (error) {
          console.error("Error fetching user count:", error);
        }
      }
    };

    const unsubscribeUserCount = fetchUserCount();

    return () => {
      if (unsubscribeUserCount) {
        unsubscribeUserCount();
      }
    };
  }, [groupId]);

  const handleSendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const db = getDatabase();
      const dbRef = ref(db, `groupChatMessages/${groupId}`);
      await push(dbRef, {
        message,
        userId: user ? user.uid : "",
        userNickname: user ? nickname : "",
        timestamp: serverTimestamp(),
        character: userCharacter, // Pass user's character number to the message
      });
      setMessage("");
    } catch (e) {
      if (e instanceof FirebaseError) {
        console.log(e);
      }
    }
  };

  return (
    <LayoutPage>
      <AuthGuard>
        <LinkBox link={"../"} icon={<AiFillHome />} />

        <div className={style.title}>
          <h1>{groupInfo.title || "ロード中..."}</h1>
          {countdown !== null ? (
            <p className={style.number}>
              {countdown !== null ? formatRemainingTime(countdown) : "00:00:00"}
            </p>
          ) : (
            <p className={style.number}>時間終了です！</p>
          )}
        </div>

        <div className={style.avatarGrid}></div>

        <div className={style.capacity}>
          <div className={style.currentUsers}>
            <FaUsers />
            <p>{userCount}/5</p>
          </div>
        </div>

        <div className={`${style.groupChatWrap}`} ref={chatBottomRef}>
          <div className={style.chatBottom}>
            <div className={style.showMessage} ref={messagesElementRef}>
              {chats.map((chat, idx) => (
                <Message
                  message={chat.message}
                  userId={chat.userId}
                  userNickname={chat.userNickname}
                  timestamp={chat.timestamp}
                  character={chat.character}
                  messageKey={chat.messageKey}
                  key={idx}
                />
              ))}
            </div>
          </div>
        </div>

        {countdown !== null ? (
          <form onSubmit={handleSendMessage}>
            <div className={style.inputWrap}>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={style.input}
                placeholder="入力してください。"
              />
              <button
                type={"submit"}
                disabled={message === ""}
                className={style.sendButton}
              >
                <BsSend />
              </button>
            </div>
          </form>
        ) : (
          <div className={style.inputWrap}>
            <p>時間終了しましたので、メッセージの送信はできません。</p>
          </div>
        )}
      </AuthGuard>
    </LayoutPage>
  );
};

export default GroupChat;
