alert("app.js wird geladen");
const { useState } = React;

function App() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const domainParam = params.get("domain");
    if (domainParam) setInput(domainParam);
  }, []);

  const riskyRegistrars = ["ultahost", "namecheap", "spaceship"];
  const riskyNameservers = [
    "ultahost",
    "spaceship",
    "dns-parking",
    "parking",
    "sedoparking",
    "bodis",
    "parklogic"
  ];

  const riskyHosting = [
    "ultahost",
    "pq hosting",
    "alexhost",
    "flokinet",
    "m247",
    "reg.ru",
    "timeweb",
    "selectel",
    "hostinger",
    "contabo",
    "ovh"
  ];

  const spamhausRiskProviders = [
    "Zhengzhou Century Connect Electronic Technology Development Co., Ltd",
    "nicenic.net",
    "ZhuHai NaiSiNiKe",
    "Miracle Ventures Ltd",
    "Longming Pte. Ltd.",
    "Ultahost",
    "SELECTEL",
    "Dynadot",
    "Sav.com",
    "RegRU",
    "REG.RU",
    "Namecheap"
  ];

  const normalizedSpamhausProviders = spamhausRiskProviders.map(x =>
    x.toLowerCase()
  );

  const riskyIps = ["91.195.240.123"];
  const riskyIpRanges = ["91.195.240."];

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
    return new Date(event.eventDate);
  }

  function containsFromList(text, list) {
    if (!text) return false;
    const lower = text.toLowerCase();
    return list.some(item => lower.includes(item.toLowerCase()));
  }

  function getRegistrar(rdap) {
    if (!rdap.entities) return "nicht gefunden";

    const regEntity = rdap.entities.find(
      e => e.roles && e.roles.includes("registrar")
    );

    if (!regEntity || !regEntity.vcardArray) return "nicht gefunden";

    const fn = regEntity.vcardArray[1].find(v => v[0] === "fn");
    return fn ? fn[3] : "nicht gefunden";
  }

  function getNameservers(rdap) {
    if (!rdap.nameservers) return [];

    return rdap.nameservers
      .map(n => n.ldhName || n.unicodeName || "")
      .filter(Boolean);
  }

  function isValidPublicIp(ip) {
    if (!ip) return false;

    const parts = ip.split(".").map(Number);

    if (
      parts.length !== 4 ||
      parts.some(n => isNaN(n) || n < 0 || n > 255)
    ) {
      return false;
    }

    const [a, b] = parts;

    if (a === 127) return false;
    if (a === 10) return false;
    if (a === 0) return false;
    if (a === 192 && b === 168) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 169 && b === 254) return false;
    if (a >= 224) return false;

    return true;
  }

  async function analyzeDomain() {
    const domain = cleanDomain(input);

    let score = 100;
    let findings = [];
    let registrar = "nicht gefunden";
    let createdText = "nicht gefunden";
    let ageDays = null;
    let ip = null;
    let ipText = "keine öffentliche IP ermittelbar";
    let hosting = "nicht gefunden";
    let nameservers = [];

    setLoading(true);

    if (!domain || !domain.includes(".")) {
      setResult({
        domain,
        score: 0,
        status: "Ungültig",
        findings: ["Bitte gültige Domain eingeben."]
      });
      setLoading(false);
      return;
    }

    const publicMailProviders = [
      "gmail.com",
      "googlemail.com",
      "gmx.de",
      "gmx.net",
      "web.de",
      "outlook.com",
      "hotmail.com",
      "live.com",
      "yahoo.com",
      "yahoo.de",
      "icloud.com",
      "me.com",
      "contractor.net",
      "mail.com",
      "inbox.com",
      "proton.me",
      "protonmail.com",
      "tutanota.com",
      "tutamail.com",
      "aol.com"
    ];

    const forceManualCheck = { active: false };

    if (publicMailProviders.includes(domain)) {
      score = Math.min(score, 70);
      forceManualCheck.active = true;
      findings.push("Öffentlicher E-Mail-Dienst. Firmenzugehörigkeit manuell prüfen.");
    }

    if (domain.endsWith(".eu")) {
      score = Math.min(score, 70);
      forceManualCheck.active = true;
      findings.push(".eu-Domain. Registrierungsdaten können eingeschränkt verfügbar sein.");
    }

    if (
      domain.includes("career") ||
      domain.includes("job") ||
      domain.includes("recruit")
    ) {
      score -= 15;
      findings.push("Recruiting-Begriffe in der Domain.");
    }

    if ((domain.match(/-/g) || []).length >= 2) {
      score -= 10;
      findings.push("Viele Bindestriche in der Domain.");
    }

    if (/\d/.test(domain)) {
      score -= 8;
      findings.push("Zahlen in der Domain.");
    }

    try {
      const rdapRes = await fetch("https://rdap.org/domain/" + domain);

      if (!rdapRes.ok) throw new Error("RDAP nicht verfügbar");

      const rdap = await rdapRes.json();
      const created = getEventDate(rdap.events, "registration");

      if (created && !isNaN(created)) {
        createdText = created.toLocaleDateString("de-DE");
        ageDays = Math.floor((new Date() - created) / (1000 * 60 * 60 * 24));

        if (ageDays < 30) {
          score -= 70;
          findings.push("HOCHRISIKANT: Domain jünger als 30 Tage.");
        } else if (ageDays < 180) {
          score -= 35;
          findings.push("Riskant: Domain jünger als 6 Monate.");
        } else if (ageDays < 365) {
          score -= 20;
          findings.push("Auffällig: Domain jünger als 1 Jahr.");
        }
      } else {
        score -= 25;
        findings.push("Kein verlässliches Registrierungsdatum gefunden.");
      }

      registrar = getRegistrar(rdap);
      nameservers = getNameservers(rdap);

      if (registrar === "nicht gefunden") {
        score -= 15;
        findings.push("Registrar nicht öffentlich sichtbar.");
      } else {
        findings.push("Registrar: " + registrar);

        if (containsFromList(registrar, riskyRegistrars)) {
          score -= 25;
          findings.push("Registrar steht auf interner Risikoliste.");
        }

        if (containsFromList(registrar, normalizedSpamhausProviders)) {
          score -= 25;
          findings.push("Registrar/Provider steht auf Spamhaus-Risikoliste.");
        }
      }

      if (nameservers.length > 0) {
        findings.push("Nameserver: " + nameservers.join(", "));

        const nsText = nameservers.join(" ");

        if (containsFromList(nsText, riskyNameservers)) {
          score -= 25;
          findings.push("Auffällige Nameserver erkannt.");
        }

        if (containsFromList(nsText, normalizedSpamhausProviders)) {
          score -= 25;
          findings.push("Nameserver/Provider steht auf Spamhaus-Risikoliste.");
        }
      } else {
        score -= 25;
        findings.push("Keine Nameserver gefunden.");
      }
    } catch (e) {
      score -= 35;
      findings.push("RDAP/WHOIS-Daten konnten nicht geprüft werden.");
    }

    try {
      const dnsRes = await fetch(
        "https://dns.google/resolve?name=" + domain + "&type=A"
      );

      const dns = await dnsRes.json();
      const record = dns.Answer?.find(a => a.type === 1);

      if (record?.data && isValidPublicIp(record.data)) {
        ip = record.data;
        ipText = ip;

        findings.push("IP-Adresse: " + ip);
        findings.push("AbuseIPDB prüfen: https://www.abuseipdb.com/check/" + ip);

        if (riskyIps.includes(ip)) {
          score -= 60;
          findings.push("KRITISCH: IP-Adresse steht auf interner Abuse-/Blacklist.");
        }

        if (riskyIpRanges.some(range => ip.startsWith(range))) {
          score -= 40;
          findings.push("KRITISCH: IP-Bereich steht auf interner Abuse-/Blacklist.");
        }

        try {
          const ipRes = await fetch("https://rdap.org/ip/" + ip);

          if (ipRes.ok) {
            const ipData = await ipRes.json();

            if (ipData.name) {
              hosting = ipData.name;
            }

            if (ipData.entities && ipData.entities.length > 0) {
              const org = ipData.entities[0].vcardArray?.[1]?.find(
                v => v[0] === "fn"
              );

              if (org) {
                hosting = org[3];
              }
            }

            findings.push("Hosting/Netzwerk: " + hosting);

            if (containsFromList(hosting, riskyHosting)) {
              score -= 25;
              findings.push("Hosting/Netzwerk steht auf interner Risikoliste.");
            }

            if (containsFromList(hosting, normalizedSpamhausProviders)) {
              score -= 25;
              findings.push("Hosting/Netzwerk steht auf Spamhaus-Risikoliste.");
            }
          }
        } catch (e) {
          score -= 10;
          findings.push("Hosting/Netzwerk konnte nicht geprüft werden.");
        }
      } else {
        score -= 35;
        findings.push("Keine gültige öffentliche IP ermittelbar.");
      }
    } catch (e) {
      score -= 35;
      findings.push("DNS/IP/Hosting konnte nicht geprüft werden.");
    }

    if (registrar === "nicht gefunden" && nameservers.length === 0 && !ip) {
      score = Math.min(score, 35);
      findings.push("KRITISCH: Keine WHOIS-/DNS-Daten vorhanden.");
    }

    score = Math.max(0, Math.min(100, score));

    let status = "Gut";

    if (score < 45) {
      status = "Kritisch";
    } else if (score < 75) {
      status = "Neutral / prüfen";
    }

    if (forceManualCheck.active && status === "Gut") {
      status = "Neutral / prüfen";
    }

    setResult({
      domain,
      score,
      status,
      registrar,
      createdText,
      ageDays,
      ip,
      ipText,
      hosting,
      nameservers,
      findings
    });

    setLoading(false);
  }

   return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow p-6">
        <h1 className="text-3xl font-bold mb-2">Domain Risiko Checker</h1>

        <p className="text-gray-600 mb-6">
          Prüft Domainalter, Registrar, Nameserver, IP, Hosting und Abuse-Risiken.
        </p>

        <div className="flex gap-3 mb-6">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="example.com"
            className="flex-1 border rounded-xl px-4 py-3"
          />

          <button
            onClick={analyzeDomain}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl disabled:opacity-60"
          >
            {loading ? "Prüfe..." : "Prüfen"}
          </button>
        </div>

        {result && (
          <div className="border rounded-xl p-5">
            <h2 className="text-2xl font-semibold mb-4">
              Ergebnis: {result.status}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
              <p><strong>Score:</strong> {result.score}/100</p>
              <p><strong>Domain:</strong> {result.domain}</p>
              <p><strong>Registriert seit:</strong> {result.createdText}</p>
              <p>
                <strong>Alter:</strong>{" "}
                {result.ageDays !== null ? result.ageDays + " Tage" : "nicht gefunden"}
              </p>
              <p><strong>Registrar:</strong> {result.registrar}</p>
              <p>
                <strong>Nameserver:</strong>{" "}
                {result.nameservers.length
                  ? result.nameservers.join(", ")
                  : "nicht gefunden"}
              </p>
              <p><strong>IP:</strong> {result.ipText}</p>
              <p><strong>Hosting:</strong> {result.hosting}</p>
            </div>

            <h3 className="text-xl font-semibold mb-2">Hinweise:</h3>

            <ul className="list-disc pl-6 space-y-1">
              {result.findings.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>

            <p className="text-sm text-gray-500 mt-5">
              Hinweis: Diese Bewertung ist nur ein Risikosignal und kein Beweis.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
