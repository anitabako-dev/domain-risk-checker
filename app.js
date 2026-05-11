const { useState } = React;

function App() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const riskyRegistrars = [
    "ultahost"
    // hier später ergänzen: "namecheap", "hostinger", ...
  ];

  function cleanDomain(value) {
    return value.toLowerCase().trim()
      .replace("https://", "")
      .replace("http://", "")
      .replace("www.", "")
      .replace("mailto:", "")
      .split("/")[0]
      .split("?")[0]
      .split("#")[0]
      .split("@").pop();
  }

  function getEventDate(events, action) {
    if (!events) return null;
    const event = events.find(e => e.eventAction === action);
    if (!event || !event.eventDate) return null;
    return new Date(event.eventDate);
  }

  async function analyzeDomain() {
    const domain = cleanDomain(input);
    let score = 100;
    let findings = [];
    let registrar = "nicht gefunden";
    let createdText = "nicht gefunden";
    let ip = "nicht gefunden";
    let hosting = "nicht gefunden";

    setLoading(true);

    if (!domain || !domain.includes(".")) {
      setResult({ domain, score: 0, status: "Ungültig", findings: ["Bitte gültige Domain eingeben."] });
      setLoading(false);
      return;
    }

    try {
      const rdapRes = await fetch("https://rdap.org/domain/" + domain);
      const rdap = await rdapRes.json();

      const created = getEventDate(rdap.events, "registration");
      if (created) {
        createdText = created.toLocaleDateString("de-DE");
        const ageDays = Math.floor((new Date() - created) / (1000 * 60 * 60 * 24));

        if (ageDays < 30) {
          score -= 70;
          findings.push("HOCHRISIKANT: Domain ist jünger als 30 Tage (" + ageDays + " Tage).");
        } else if (ageDays < 180) {
          score -= 35;
          findings.push("Riskant: Domain ist jünger als 6 Monate (" + ageDays + " Tage).");
        } else if (ageDays < 365) {
          score -= 20;
          findings.push("Auffällig: Domain ist jünger als 1 Jahr (" + ageDays + " Tage).");
        } else {
          findings.push("Domainalter unauffällig: " + ageDays + " Tage.");
        }
      }

      if (rdap.entities && rdap.entities.length > 0) {
        const regEntity = rdap.entities.find(e => e.roles && e.roles.includes("registrar"));
        if (regEntity && regEntity.vcardArray) {
          const fn = regEntity.vcardArray[1].find(v => v[0] === "fn");
          if (fn) registrar = fn[3];
        }
      }

      if (registrar !== "nicht gefunden") {
        findings.push("Registrar: " + registrar);

        if (riskyRegistrars.some(r => registrar.toLowerCase().includes(r))) {
          score -= 35;
          findings.push("Riskanter Registrar laut interner Liste.");
        }
      }
    } catch (e) {
      findings.push("Domainalter/Registrar konnte nicht geprüft werden.");
    }

    try {
      const dnsRes = await fetch("https://dns.google/resolve?name=" + domain + "&type=A");
      const dns = await dnsRes.json();

      if (dns.Answer && dns.Answer.length > 0) {
        ip = dns.Answer.find(a => a.type === 1)?.data || "nicht gefunden";
        findings.push("IP-Adresse: " + ip);

        const ipRes = await fetch("https://rdap.org/ip/" + ip);
        const ipData = await ipRes.json();

        if (ipData.name) hosting = ipData.name;
        if (ipData.entities && ipData.entities.length > 0) {
          const org = ipData.entities[0].vcardArray?.[1]?.find(v => v[0] === "fn");
          if (org) hosting = org[3];
        }

        findings.push("Hosting/Netzwerk: " + hosting);
      } else {
        score -= 10;
        findings.push("Keine A-Record-IP gefunden.");
      }
    } catch (e) {
      findings.push("IP/Hosting konnte nicht geprüft werden.");
    }

    score = Math.max(0, Math.min(100, score));

    let status = "Gut";
    if (score < 45) status = "Kritisch";
    else if (score < 75) status = "Neutral / prüfen";

    setResult({ domain, score, status, registrar, createdText, ip, hosting, findings });
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-8">
        <h1 className="text-3xl font-bold mb-2">Domain Risiko Checker</h1>
        <p className="text-slate-600 mb-6">Prüft Domainalter, Registrar, IP und Hostingdaten.</p>

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="firma.com oder mail@firma.com"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 border rounded-xl px-4 py-3"
          />

          <button onClick={analyzeDomain} className="bg-black text-white px-5 rounded-xl">
            {loading ? "Prüfe..." : "Prüfen"}
          </button>
        </div>

        {result && (
          <div className="mt-8">
            <div className="text-2xl font-bold mb-2">Ergebnis: {result.status}</div>
            <div className="mb-4">Score: {result.score}/100</div>

            <div className="bg-slate-100 rounded-xl p-4 mb-4">
              <div><b>Domain:</b> {result.domain}</div>
              <div><b>Registriert seit:</b> {result.createdText}</div>
              <div><b>Registrar:</b> {result.registrar}</div>
              <div><b>IP:</b> {result.ip}</div>
              <div><b>Hosting/Netzwerk:</b> {result.hosting}</div>
            </div>

            <div className="bg-slate-100 rounded-xl p-4">
              <div className="font-semibold mb-2">Hinweise:</div>
              <ul className="list-disc ml-5">
                {result.findings.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
