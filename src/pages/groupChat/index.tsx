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
import { FaUsers } from "react-icons/fa6";
import { PiBookBookmark, PiBookBookmarkFill } from "react-icons/pi";
import { BsSend } from "react-icons/bs";
import { format, intervalToDuration, formatDuration } from "date-fns";
import { useRouter } from "next/router";
import style from "@/styles/groupChat.module.scss";
import LayoutPage from "@/component/LayoutPage";
import Image from "next/image";
import { usePresence } from "@/component/presenceUtils";
import LinkBox from "@/component/LinkBox";
import { AiFillHome } from "react-icons/ai";
import { formatRemainingTime } from "@/utils/formatTime";

type MessageProps = {
  message: string;
  userId: string;
  userNickname: string;
  timestamp: number;
  character: number; // Add character field to MessageProps
  key: string;
};

type DictionaryItem = {
  message: string;
  timestamp: number;
  saved: boolean;
};

const Message = ({
  message,
  userNickname,
  timestamp,
  character,
  userId,
  key,
}: MessageProps) => {
  const formattedTimestamp = format(new Date(timestamp), "HH:mm");
  const auth = getAuth();
  const user = auth.currentUser;
  const isCurrentUser = userId === user?.uid;
  const [isInteracted, setIsInteracted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

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

        const isMessageSaved = existingMessages.some(
          (existingMessage) => existingMessage.message === message
        );

        setIsBookmarked(isMessageSaved);
      } catch (error) {
        console.error("Error checking if message is saved:", error);
      }
    };

    checkIfMessageSaved();
  }, [user, message]); // Dependency on user and message ensures the effect runs when either changes

  const handleBookmarkClick = async () => {
    setIsInteracted(true);

    try {
      if (!user) {
        return;
      }

      const db = getFirestore();
      const usersCollection = collection(db, "users");
      const userDocRef = doc(usersCollection, user.uid);

      const dictionaryItem: DictionaryItem = {
        message,
        timestamp,
        saved: !isBookmarked,
      };

      const userData = (await getDoc(userDocRef)).data();
      const existingMessages: DictionaryItem[] = userData?.dictionary || [];
      const isMessageExists = existingMessages.some(
        (existingMessage) => existingMessage.message === message
      );

      if (!isMessageExists) {
        await updateDoc(userDocRef, {
          dictionary: arrayUnion(dictionaryItem),
        });

        setIsBookmarked(!isBookmarked);
        console.log("Message saved to dictionary!");
      } else {
        console.log("Message already exists in the dictionary.");
      }
    } catch (error) {
      console.error("Error saving message to dictionary:", error);
    }
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
              <div className={style.message}>{message}</div>
            </div>
            <div className={style.timestamp}>
              <div className={style.bookmark}>
                <button onClick={handleBookmarkClick}>
                  {isBookmarked ? <PiBookBookmarkFill /> : <PiBookBookmark />}
                </button>
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
  const [userCharacter, setUserCharacter] = useState<number>(1); // Initialize with a default value
  const auth = getAuth();
  const user: User | null = auth.currentUser;
  const router = useRouter();
  const { groupId, planet } = router.query; // No need to extract 'title' from the router query
  const [groupInfo, setGroupInfo] = useState({ title: "", expirationTime: "" });
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
        const key = snapshot.key; // Use the message key from Firebase as a unique identifier

        // Check if the message already exists in the state
        const isMessageExists = chats.some((chat) => chat.key === key);

        if (!isMessageExists) {
          setChats((prev) => [
            ...prev,
            { message, userId, userNickname, timestamp, character, key },
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
        const remainingTime = intervalToDuration({
          start: now,
          end: expirationTime,
        });

        if (
          remainingTime.hours ||
          remainingTime.minutes ||
          remainingTime.seconds
        ) {
          setCountdown(remainingTime);
        } else {
          // The countdown has reached zero
          setCountdown(null);
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
        <div className={style.body}>
          <LinkBox link={"../"} icon={<AiFillHome />} />

          <div className={style.title}>
            <h1>{groupInfo.title || "ロード中..."}</h1>
            {countdown !== null ? (
              <p className={style.number}>
                {countdown !== null
                  ? formatRemainingTime(countdown)
                  : "00:00:00"}
              </p>
            ) : (
              <p className={style.number}>時間終了です！</p>
            )}
          </div>

          <div></div>

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
                {chats.map((chat) => (
                  <Message
                    message={chat.message}
                    userId={chat.userId}
                    userNickname={chat.userNickname}
                    timestamp={chat.timestamp}
                    character={chat.character}
                    key={`${chat.key}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {countdown !== null ? (
            <form onSubmit={handleSendMessage}>
              <div className={style.inputWrap}>
                <textarea
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
        </div>
      </AuthGuard>
    </LayoutPage>
  );
};

export default GroupChat;
