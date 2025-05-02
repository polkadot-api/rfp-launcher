import { RfpForm } from "./components/RfpForm";
import { Header } from "./Header";

function App() {
  return (
    <div className="flex flex-col items-center max-h-screen">
      <div className="w-full border-b p-2 overflow-hidden shrink-0">
        <Header />
      </div>
      <div className="w-full overflow-auto p-2">
        <div className="max-w-5xl m-auto">
          <RfpForm />
        </div>
      </div>
    </div>
  );
}

export default App;
