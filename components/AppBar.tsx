import Link from "next/link";

export default function AppBar({ back = "/" }: { back?: string | null }) {
  return (
    <header className="appbar">
      <div className="appbar-inner">
        {back && (
          <Link href={back} className="appbar-back">
            ←
          </Link>
        )}
        <Link href="/" className="appbar-brand">
          오답 반복학습
        </Link>
      </div>
    </header>
  );
}
