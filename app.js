const { useState } = React;

function App() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);

  function analyzeDomain() {
    let domain = input.toLowerCase().trim();

    if (domain.includes("@")) {
      domain = domain.split("@")[1];
    }

    let score = 100;
    let findings = [];

    const freeMail = [
      "gmail.com",
      "outlook.com",
      "hotmail.com",
      "yahoo.com",
      "icloud.com",
      "gmx.at",
      "gmx.de",
      "web.de"
    ];

    if (freeMail.includes(domain)) {
      score -= 40;
      findings.push("Kostenlose Maildomain");
    }

    if (domain.includes("career") || domain.includes("job")) {
      score -= 15;
      findings.push("Verdächtige Recruiting-Begriffe");
    }

    if ((domain.match(/-/g) || []).length >= 2) {
      score -= 10;
      findings.push("Viele Bindestriche");
    }

    if (/\d/.test(domain)) {
      score -= 10;
      findings.push("Zahlen in Domain");
    }

    let status = "Gut";

    if (score < 40) {
      status = "Kritisch";
    } else if (score < 70) {
      status = "Neutral";
    }

    setResult({
      domain,
      score,
      status,
      findings
    });
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow p-8">

        <h1 className="text-3xl font-bold mb-6">
          Domain Risiko Checker
        </h1>

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="firma.com oder mail@firma.com"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 border rounded-xl px-4 py-3"
          />

          <button
            onClick={analyzeDomain}
            className="bg-black text-white px-5 rounded-xl"
          >
            Prüfen
          </button>
        </div>

        {result && (
          <div className="mt-8">

            <div className="text-xl font-bold mb-2">
              Ergebnis: {result.status}
            </div>

            <div className="mb-4">
              Score: {result.score}/100
            </div>

            <div className="bg-slate-100 rounded-xl p-4">
              <div className="font-semibold mb-2">
                Hinweise:
              </div>

              {result.findings.length === 0 ? (
                <div>Keine Auffälligkeiten erkannt.</div>
              ) : (
                <ul className="list-disc ml-5">
                  {result.findings.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
