import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 text-white">
      <div className="text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          Welcome to the Data Dashboard
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-10">
          Visualize your waste data with interactive charts.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-8 py-4 text-lg font-semibold text-white bg-purple-600 rounded-lg shadow-lg hover:bg-purple-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
        >
          Go to Dashboard
        </Link>
      </div>

      <footer className="absolute bottom-8 text-center text-gray-500 w-full">
        <p>Built with Next.js, Tailwind CSS, and Chart.js</p>
      </footer>
    </main>
  );
}
