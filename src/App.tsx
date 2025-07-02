import { Header } from "./components/Header";
import { RfpForm } from "./components/RfpForm";

function App() {
  return (
    <div className="min-h-screen bg-canvas-cream">
      {/* Poster-style header */}
      <Header />

      {/* Main content with poster spacing */}
      <main className="poster-container">
        <RfpForm />
      </main>
    </div>
  );
}

export default App;
