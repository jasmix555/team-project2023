import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  getFirestore,
  Firestore,
} from "firebase/firestore";
import { getAuth, User } from "firebase/auth";
import Header from "@/component/Header";
import {
  FaRegCircleXmark,
  FaBell,
  FaUserAstronaut,
  FaBook,
  FaGear,
  FaUsers,
  FaPlus,
} from "react-icons/fa6";
import { FaEdit } from "react-icons/fa";
import { RiMenu3Line } from "react-icons/ri";
import Link from "next/link";
import { useRouter } from "next/router";
import style from "@/styles/createdGroups.module.scss";
import BackBtn from "@/component/BackBtn";
import LayoutPage from "@/component/LayoutPage";
import Background from "@/component/Background";

const menus = {
  icon: <RiMenu3Line />,
  options: [
    { icon: <FaRegCircleXmark />, link: "/#" },
    { icon: <FaBell />, link: "/#" },
    { icon: <FaUserAstronaut />, link: "/#" },
    { icon: <FaUsers />, link: "/#" },
    { icon: <FaEdit />, link: "/#" },
    { icon: <FaBook />, link: "/#" },
    { icon: <FaGear />, link: "/../settings" },
  ],
};

const CreatedGroups = () => {
  const [groups, setGroups] = useState<{ id: string; title: string }[]>([]);
  const auth = getAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.currentUser) {
      const db: Firestore = getFirestore();
      const fetchCreatedGroups = async () => {
        try {
          const groupsCollection = collection(db, "groups");
          const user = auth.currentUser as User;
          const q = query(groupsCollection);
          const querySnapshot = await getDocs(q);

          const groupData: { id: string; title: string }[] = [];

          querySnapshot.forEach((doc) => {
            const data = doc.data();
            groupData.push({
              id: doc.id,
              title: data.title,
            });
          });

          setGroups(groupData);
        } catch (error) {
          console.error("Error fetching created groups:", error);
        }
      };

      fetchCreatedGroups();
    }
  }, [auth]);

  return (
    <>
      <LayoutPage>
        <Background />
        <Header contents={menus} />
        <h1>Created Groups</h1>
        <div className={style.body}>
          <ul>
            {groups.map((group, index) => (
              <li
                key={group.id}
                style={{
                  border: `1px solid hsl(${Math.random() * 360}, 100%, 50%)`,
                  top: `${Math.random() * 50}vh`, // Adjust the range as needed
                  left: `${Math.random() * 80}vw`, // Adjust the range as needed
                  zIndex: index, // Ensure a proper stacking order
                }}
              >
                <Link
                  href={{
                    pathname: `/groupChat`,
                    query: { groupId: group.id, title: group.title },
                  }}
                >
                  <p>{group.title}</p>
                </Link>
              </li>
            ))}
          </ul>
          <div className={style.createGroup}>
            <Link href={"/createGroup"}>
              <button className={style.create}>
                <FaPlus />
              </button>
            </Link>
            <BackBtn link={"/adventure"} />
          </div>
        </div>
      </LayoutPage>
    </>
  );
};

export default CreatedGroups;
