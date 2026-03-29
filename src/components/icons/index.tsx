"use client";

import type { IconBaseProps, IconType } from "react-icons";
import { FcGoogle } from "react-icons/fc";
import {
  LuBookHeart,
  LuBookOpenCheck,
  LuBookOpenText,
  LuBuilding2,
  LuCheck,
  LuChevronDown,
  LuChevronLeft,
  LuChevronRight,
  LuCircleHelp,
  LuCopy,
  LuHeart,
  LuHeartOff,
  LuHouse,
  LuLanguages,
  LuLoaderCircle,
  LuLogIn,
  LuLogOut,
  LuMoon,
  LuNotebookPen,
  LuNotebookText,
  LuPencil,
  LuPlus,
  LuSearch,
  LuSettings,
  LuShield,
  LuShieldOff,
  LuSparkles,
  LuSun,
  LuTrash2,
  LuType,
  LuUserMinus,
  LuUserPlus,
  LuUserRound,
  LuUsers,
  LuX,
} from "react-icons/lu";
import { SiKakaotalk } from "react-icons/si";

export type AppIconProps = Pick<IconBaseProps, "className" | "title">;

function createIcon(IconComponent: IconType) {
  return function AppIcon({ className, title }: AppIconProps) {
    return <IconComponent className={className} title={title} aria-hidden={title ? undefined : true} focusable="false" />;
  };
}

export const BookHeart = createIcon(LuBookHeart);
export const BookOpenCheck = createIcon(LuBookOpenCheck);
export const BookOpenText = createIcon(LuBookOpenText);
export const Building2 = createIcon(LuBuilding2);
export const Check = createIcon(LuCheck);
export const ChevronDown = createIcon(LuChevronDown);
export const ChevronLeft = createIcon(LuChevronLeft);
export const ChevronRight = createIcon(LuChevronRight);
export const CircleHelp = createIcon(LuCircleHelp);
export const Copy = createIcon(LuCopy);
export const GoogleBrand = createIcon(FcGoogle);
export const Heart = createIcon(LuHeart);
export const HeartOff = createIcon(LuHeartOff);
export const House = createIcon(LuHouse);
export const KakaoBrand = createIcon(SiKakaotalk);
export const Languages = createIcon(LuLanguages);
export const Loader2 = createIcon(LuLoaderCircle);
export const LogIn = createIcon(LuLogIn);
export const LogOut = createIcon(LuLogOut);
export const Moon = createIcon(LuMoon);
export const NotebookPen = createIcon(LuNotebookPen);
export const NotebookText = createIcon(LuNotebookText);
export const Pencil = createIcon(LuPencil);
export const Plus = createIcon(LuPlus);
export const Search = createIcon(LuSearch);
export const Settings = createIcon(LuSettings);
export const Shield = createIcon(LuShield);
export const ShieldOff = createIcon(LuShieldOff);
export const Sparkles = createIcon(LuSparkles);
export const Sun = createIcon(LuSun);
export const Trash2 = createIcon(LuTrash2);
export const Type = createIcon(LuType);
export const UserMinus = createIcon(LuUserMinus);
export const UserPlus = createIcon(LuUserPlus);
export const UserRound = createIcon(LuUserRound);
export const Users = createIcon(LuUsers);
export const X = createIcon(LuX);
