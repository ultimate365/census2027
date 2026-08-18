import "./globals.css";
import Navbar from "./components/Navbar";

export const metadata = {
  title: "Census 2027",
  description: "Census 2027 Household Data Collection System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-100 text-gray-900">
        <Navbar />

        {children}
      </body>
    </html>
  );
}
