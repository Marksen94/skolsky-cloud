// Táto stránka bola nahradená /update-password
// Presmeruj sem pre spätnnú kompatibilitu
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ResetPasswordRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/update-password'); }, [router]);
  return null;
}
