import Image from "next/image";

interface Store {
  name: string;
  logoUrl: string | null;
}

export function StoreHeader({ store }: { store: Store }) {
  return (
    <header className="border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
        {store.logoUrl ? (
          <Image
            src={store.logoUrl}
            alt={store.name}
            width={40}
            height={40}
            className="rounded-lg"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white text-lg">📺</span>
          </div>
        )}
        <span className="font-bold text-white text-lg">{store.name}</span>
      </div>
    </header>
  );
}
