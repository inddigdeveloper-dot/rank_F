import { redirect } from 'next/navigation';

export async function GET() {
  const backendUrl =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8000';

  redirect(`${backendUrl}/login/google`);
}
