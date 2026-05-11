const { useState } = React;

function App() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  function cleanDomain(value) {
    return value
      .toLowerCase()
      .trim()
      .replace("https://", "")
      .replace("http://", "")
      .replace("www.", "")
      .replace("mailto:", "")
      .split("/")[0]
      .split("?")[0]
      .split("#")[0]
      .split("@")
      .pop();
  }

  function getEventDate(events, action) {
    if (!events) return null;
    const event = events.find(e => e.eventAction === action);
    if (!event || !event.eventDate) return null;
    return new Date(event.eventDate[0]);
  }

  async function analyzeDomain() {
    const domain = cleanDomain(input);
    let score = 100;
    let findings = [];

    if (!domain || !domain.includes(".")) {
      setResult({ domain, score: 0, status: "Ungültig", findings: ["Bitte gültige Domain eingeben."] });
      return;
    }

    setLoading(true);

    const freeMail = [
      "gmail.com", "outlook.com", "hotmail.com", "yahoo.com",
      "icloud.com", "gmx.at", "gmx.de", "web.de", "aol.com"
    ];

    if (freeMail.includes(domain)) {
      score -= 45;
      findings.push("Kostenlose Maildomain – für Firmenkommunikation kritisch.");
    }

    if (domain.includes("career") || domain.includes("careers") || domain.includes("job") || domain.includes("recruit")) {
      score -= 20;
      findings.push("Recruiting-Begriffe in der Domain – bei Fake-Karriere-Seiten auffällig.");
    }

    if ((domain.match(/-/g) || []).length >= 2) {
      score -= 12;
      findings.push("Viele Bindestriche in der Domain.");
    }

    if (/\d/.test(domain)) {
      score -= 8;
      findings.push("Zahlen in der Domain.");
    }

    const riskyEndings = ["xyz", "top", "click", "work", "site", "online"];
    const tld = domain.split(".").pop();

    if (riskyEndings.includes(tld)) {
      score -= 15;
      findings.push("Auffällige Domain-Endung: ." + tld);
    }

    try {
      const response = await fetch("https://rdap.org/domain/" + domain);
      const data = await response.json();

      const created = getEventDate(data.events, "registration");
      const expiry = getEventDate(data.events, "expiration");

      if (created) {
        const ageDays = Math.floor((new Date() - created) / (1000 * 60 * 60 * 24));

        if (ageDays < 30) {
          score -= 35;
          findings.push("Domain ist sehr neu: " + ageDays + " Tage alt.");
        } else if (ageDays < 180) {
          score -= 25;
          findings.push("Domain ist jung: ca. " + Math.round(ageDays / 30) + " Monate alt.");
        } else if (ageDays < 365) {
          score -= 12;
          findings.push("Domain ist unter 1 Jahr alt.");
        } else {
          findings.push("Domain besteht länger als 1 Jahr.");
        }
      }

      if (created && expiry) {
        const regDays = Math.floor((expiry - created) / (1000 * 60 * 60 * 24));
        if (regDays <= 370) {
          score -= 5;
          findings.push("Domain wurde offenbar nur für ca. 1 Jahr registriert.");
        }
      }

    } catch (e) {
      findings.push("Domainalter konnte online nicht geprüft werden.");
    }

    score = Math.max(0, Math.min(100, score));

    let status = "Gut";
    if (score < 45) status = "Kritisch";
    else if (score < 75) status = "Neutral / prüfen";

    if (findings.length === 0) {
      findings.push("Keine einfachen Auffälligkeiten erkannt.");
    }

    setResult({ domain, score, status, findings });
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow p-8">
        <h1 className="text-3xl font-bold mb-2">Domain Risiko Checker</h1>
        <p className="text-slate-600 mb-6">Schnellprüfung für Maildomains, Karriere-Seiten und Transportkontakte.</p>

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
            {loading ? "Prüfe..." : "Prüfen"}
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
              <div className="font-semibold mb-2">Hinweise:</div>
              <ul className="list-disc ml-5">
                {result.findings.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
