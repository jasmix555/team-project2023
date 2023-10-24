import { ReactElement, useState } from "react";
import style from "@/styles/OptionBox.module.scss";
import { IconButton } from "@chakra-ui/react";
import { IconType } from "react-icons";
import Link from "next/link";

type Props = {
  icon?: ReactElement;
};

export default function OptionBox({ icon }: Props) {
  return (
    <>
      <div className={style.wrapper}>
        <button className={style.icon}>{icon}</button>
      </div>
    </>
  );
}
