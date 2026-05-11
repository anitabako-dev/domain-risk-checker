const { useState } = React;

function App() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const riskyRegistrars = [
    "ultahost",
    "namecheap",
    "spaceship"
  ];

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
    "郑州世纪创联电子科技开发有限公司",
    "万商云集",
    "Autónomos",
    "301domains",
    "NameMart Pte. Ltd.",
    "FE-SU",
    "ALMIC",
    "URL-Lösungen",
    "FE-RU",
    "Ultahost",
    "KENPAI",
    "NIC. UA LLC",
    "域见未来",
    "Kenpai International",
    "WebNic",
    "北京新网",
    "Atak Domain",
    "甘肃云创空间",
    "Namemart",
    "Immaterialismus",
    "EU Technology",
    "天津追日",
    "Devexpanse",
    "Regery",
    "Netcom.cm",
    "Guizhou Zhongyu",
    "NameSilo",
    "Laxweb",
    "NICENIC INTERNATIONAL",
    "云南互道云",
    "IMMATERIALISM",
    "Ardis",
    "Domain International Services",
    "sudu.cn",
    "Sollutium",
    "成都垦派",
    "SELECTEL",
    "厦门纳网",
    "Vantage of Convergence",
    "MainReg",
    "厦门市中资源",
    "Global Domain Group",
    "海南美洁达",
    "四川域趣",
    "west263.com",
    "斗麦",
    "北京网尊",
    "nawang.cn",
    "Dynadot",
    "Sav.com",
    "合肥聚名",
    "Cosmotown",
    "RegRU",
    "REG.RU",
    "Pan-Asia Information",
    "北京国科云",
    "OwnRegistrar",
    "Trunkoz",
    "厦门三五互联",
    "NAMEMART",
    "海口智慧康",
    "广东金万邦",
    "Evolución Perú",
    "Dominet",
    "厦门易名",
    "包头市特木鲁",
    "武汉物与伦比",
    "长春市智绘",
    "PT Registrasi Neva Angkasa",
    "Cloud Yuqu",
    "Fewmoretaps",
    "Trustname",
    "Dnsgulf",
    "长沙小豆",
    "Hello Internet",
    "成都飞数",
    "商中在线",
    "Mat Bao",
    "Gransy",
    "Registrar.eu",
    "Name.com",
    "Hefei Juming",
    "TuringSign",
    "NauNet",
    "Turingsign",
    "Shinjiru",
    "云南蓝队云",
    "eName",
    "上海福虎",
    "邦宁数字",
    "北京国旭",
    "阿里云",
    "Domainipr",
    "Namecheap"
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

  function containsFromList(text, list) {
    if (!text) return false;
    const lower = text.toLowerCase();
    return list.some(item => lower.includes(item.toLowerCase()));
  }

  function getRegistrar(rdap) {
    if (!rdap.entities) return "nicht gefunden";
    const regEntity = rdap.entities.find(e => e.roles && e.roles.includes("registrar"));
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

  async function analyzeDomain() {
    const domain = cleanDomain(input);
    let score = 100;
    let findings = [];

    let registrar = "nicht gefunden";
    let createdText = "nicht gefunden";
    let ageDays = null;
    let ip = "nicht gefunden";
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
      score -= 45;
      findings.push("Kostenlose Maildomain – für Firmenkommunikation kritisch.");
    }

    if (domain.includes("career") || domain.includes("job") || domain.includes("recruit")) {
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
      const rdap = await rdapRes.json();

      const created = getEventDate(rdap.events, "registration");

      if (created && !isNaN(created)) {
        createdText = created.toLocaleDateString("de-DE");
        ageDays = Math.floor((new Date() - created) / (1000 * 60 * 60 * 24));

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
      } else {
        score -= 25;
        findings.push("Kein verlässliches Registrierungsdatum gefunden.");
      }

      registrar = getRegistrar(rdap);
      nameservers = getNameservers(rdap);

      if (registrar === "nicht gefunden") {
        score -= 8;
        findings.push("Registrar nicht öffentlich sichtbar oder nicht ermittelbar.");
      } else {
        findings.push("Registrar: " + registrar);

        if (containsFromList(registrar, riskyRegistrars)) {
          score -= 25;
          findings.push("Registrar steht auf interner Risikoliste.");
        }

        if (containsFromList(registrar, spamhausRiskProviders)) {
          score -= 20;
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

        if (containsFromList(nsText, spamhausRiskProviders)) {
          score -= 20;
          findings.push("Nameserver/Provider steht auf Spamhaus-Risikoliste.");
        }
      } else {
        score -= 15;
        findings.push("Keine Nameserver gefunden.");
      }

    } catch (e) {
      score -= 30;
      findings.push("RDAP/WHOIS-Daten konnten nicht geprüft werden.");
    }

    try {
      const dnsRes = await fetch("https://dns.google/resolve?name=" + domain + "&type=A");
      const dns = await dnsRes.json();

      if (dns.Answer && dns.Answer.length > 0) {
        const record = dns.Answer.find(a => a.type === 1);
        if (record) {
          ip = record.data;
          findings.push("IP-Adresse: " + ip);

          const ipRes = await fetch("https://rdap.org/ip/" + ip);
          const ipData = await ipRes.json();

          if (ipData.name) {
            hosting = ipData.name;
          }

          if (ipData.entities && ipData.entities.length > 0) {
            const org = ipData.entities[0].vcardArray?.[1]?.find(v => v[0] === "fn");
            if (org) hosting = org[3];
          }

          findings.push("Hosting/Netzwerk: " + hosting);

          if (containsFromList(hosting, riskyHosting)) {
            score -= 25;
            findings.push("Hosting/Netzwerk steht auf interner Risikoliste.");
          }

          if (containsFromList(hosting, spamhausRiskProviders)) {
            score -= 25;
            findings.push("Hosting/Netzwerk steht auf Spamhaus-Risikoliste.");
          }
        }
      } else {
        score -= 10;
        findings.push("Keine A-Record-IP gefunden.");
      }
    } catch (e) {
      score -= 10;
      findings.push("IP/Hosting konnte nicht geprüft werden.");
    }

    if (ageDays !== null && ageDays < 30) {
      score = Math.min(score, 30);
    }

    if (
      ageDays !== null &&
      ageDays < 180 &&
      (
        containsFromList(registrar, riskyRegistrars) ||
        containsFromList(nameservers.join(" "), riskyNameservers) ||
        containsFromList(hosting, riskyHosting) ||
        containsFromList(registrar + " " + nameservers.join(" ") + " " + hosting, spamhausRiskProviders)
      )
    ) {
      score = Math.min(score, 40);
      findings.push("Kombination aus junger Domain und auffälliger Infrastruktur.");
    }

    score = Math.max(0, Math.min(100, score));

    let status = "Gut";
    if (score < 45) status = "Kritisch";
    else if (score < 75) status = "Neutral / prüfen";

    setResult({
      domain,
      score,
      status,
      registrar,
      createdText,
      ageDays,
      ip,
      hosting,
      nameservers,
      findings
    });

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow p-8">
        <h1 className="text-3xl font-bold mb-2">Domain Risiko Checker</h1>
        <p className="text-slate-600 mb-6">
          Prüft Domainalter, Registrar, Nameserver, IP, Hosting und interne Risikolisten.
        </p>

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
            <div className="text-2xl font-bold mb-2">
              Ergebnis: {result.status}
            </div>

            <div className="mb-4">
              Score: {result.score}/100
            </div>

            <div className="bg-slate-100 rounded-xl p-4 mb-4 space-y-1">
              <div><b>Domain:</b> {result.domain}</div>
              <div><b>Registriert seit:</b> {result.createdText}</div>
              <div><b>Alter:</b> {result.ageDays !== null ? result.ageDays + " Tage" : "nicht gefunden"}</div>
              <div><b>Registrar:</b> {result.registrar}</div>
              <div><b>Nameserver:</b> {result.nameservers.length ? result.nameservers.join(", ") : "nicht gefunden"}</div>
              <div><b>IP:</b> {result.ip}</div>
              <div><b>Hosting/Netzwerk:</b> {result.hosting}</div>
            </div>

            <div className="bg-slate-100 rounded-xl p-4">
              <div className="font-semibold mb-2">Hinweise:</div>
              <ul className="list-disc ml-5">
                {result.findings.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>

            <div className="mt-4 text-sm text-slate-500">
              Hinweis: Diese Bewertung ist ein Risikosignal, kein Beweis. Junge Domain + auffälliger Provider + fehlende Firmenhistorie ist besonders kritisch.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
