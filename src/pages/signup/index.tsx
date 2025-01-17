import { useState, FormEvent } from "react";
import {
  getAuth,
  createUserWithEmailAndPassword,
  UserCredential,
  sendEmailVerification,
} from "firebase/auth";
import { useRouter } from "next/router";
import style from "@/styles/form.module.scss";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import LayoutPage from "@/component/LayoutPage";
import Link from "next/link";

export default function Register() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [show, setShow] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const router = useRouter();

  const handleClick = () => setShow(!show);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const auth = getAuth();
      const userCredential: UserCredential =
        await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      // Registration successful, redirect to the profile setup page
      setEmail("");
      setPassword("");
      router.push("/signin");
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LayoutPage>
      <form onSubmit={handleSubmit}>
        <div className={style.contentWrap}>
          <div className={style.logo}></div>
          <div className={style.inputWrap}>
            <div className={style.frame}></div>
            <div className={style.title}>Sign Up</div>
            <div className={style.content}>
              <label htmlFor="email">E-Mail</label>
              <input
                id="email"
                className={style.input}
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="ecc-comp@gmail.com"
              />
            </div>
            <div className={style.content}>
              <label htmlFor="password">Password</label>
              <div className={style.iconVis}>
                <input
                  id="password"
                  className={style.input}
                  type={show ? "text" : "password"}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="・・・・・・"
                />
                <i onClick={handleClick}>
                  {show ? <AiFillEye /> : <AiFillEyeInvisible />}
                </i>
              </div>
            </div>
            <div className={style.link}>
              <Link href="/signin">アカウントをお持ちの方はこちら</Link>
            </div>
          </div>
          <div className={style.submitWrap}>
            <button type="submit" disabled={isLoading}>
              {isLoading ? "Registering..." : "Register"}
            </button>
          </div>
        </div>
      </form>
    </LayoutPage>
  );
}
