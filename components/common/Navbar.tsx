// components/common/Navbar.tsx — 服务端导航栏
// 职责：获取 Better Auth session，将用户数据传给 NavbarClient

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { NavbarClient } from './NavbarClient';

interface NavbarProps {
  lang: string;
}

export async function Navbar({ lang }: NavbarProps) {
  const session = await auth.api.getSession({ headers: await headers() });

  const user = session?.user
    ? { name: session.user.name, email: session.user.email }
    : null;

  return <NavbarClient lang={lang} user={user} />;
}
