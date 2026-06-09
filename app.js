const { useState } = React;

function App() {
  const [input, setInput] = useState("");
  React.useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const domainParam = params.get("domain");

  if (domainParam) {
    setInput(domainParam);

    setTimeout(() => {
      analyzeDomain();
    }, 300);
  }
}, []);
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

  const normalizedSpamhausProviders =
    spamhausRiskProviders.map(x => x.toLowerCase());

  const riskyIps = [
    "91.195.240.123"
  ];

  const riskyIpRanges = [
    "91.195.240."
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

    const event = events.find(
      e => e.eventAction === action
    );

    if (!event || !event.eventDate)
      return null;

    return new Date(event.eventDate);
  }

  function containsFromList(text, list) {
    if (!text) return false;

    const lower = text.toLowerCase();

    return list.some(item =>
      lower.includes(item.toLowerCase())
    );
  }

  function getRegistrar(rdap) {
    if (!rdap.entities)
      return "nicht gefunden";

    const regEntity = rdap.entities.find(
      e => e.roles &&
      e.roles.includes("registrar")
    );

    if (!regEntity || !regEntity.vcardArray)
      return "nicht gefunden";

    const fn = regEntity.vcardArray[1].find(
      v => v[0] === "fn"
    );

    return fn ? fn[3] : "nicht gefunden";
  }

  function getNameservers(rdap) {
    if (!rdap.nameservers) return [];

    return rdap.nameservers
      .map(n =>
        n.ldhName ||
        n.unicodeName ||
        ""
      )
      .filter(Boolean);
  }

  function isValidPublicIp(ip) {
    if (!ip) return false;

    const parts = ip.split(".").map(Number);

    if (
      parts.length !== 4 ||
      parts.some(n =>
        isNaN(n) ||
        n < 0 ||
        n > 255
      )
    ) {
      return false;
    }

    const [a, b] = parts;

    if (a === 127) return false;
    if (a === 10) return false;
    if (a === 0) return false;
    if (a === 192 && b === 168)
      return false;

    if (
      a === 172 &&
      b >= 16 &&
      b <= 31
    ) {
      return false;
    }

    if (a === 169 && b === 254)
      return false;

    if (a >= 224)
      return false;

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
    let ipText =
      "keine öffentliche IP ermittelbar";

    let hosting = "nicht gefunden";
    let nameservers = [];

    setLoading(true);

    if (
      !domain ||
      !domain.includes(".")
    ) {
      setResult({
        domain,
        score: 0,
        status: "Ungültig",
        findings: [
          "Bitte gültige Domain eingeben."
        ]
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
  "aol.com",
  "libero.it",
  "alice.it",
  "virgilio.it",
  "tiscali.it",
  "wp.pl",
  "o2.pl",
  "onet.pl",
  "seznam.cz",
  "centrum.cz",
  "atlas.sk",
  "azet.sk",
  "rambler.ru",
  "yandex.com",
  "yandex.ru"
];

const forceManualCheck = {
  active: false
};

if (publicMailProviders.includes(domain)) {
  score = Math.min(score, 70);
  forceManualCheck.active = true;

  findings.push(
    "Öffentlicher E-Mail-Dienst. Firmenzugehörigkeit manuell prüfen."
  );
}

if (domain.endsWith(".eu")) {
  score = Math.min(score, 70);
  forceManualCheck.active = true;

  findings.push(
    ".eu-Domain. Registrierungsdaten können eingeschränkt verfügbar sein. Manuelle Prüfung empfohlen."
  );
}

    if (
      domain.includes("career") ||
      domain.includes("job") ||
      domain.includes("recruit")
    ) {
      score -= 15;

      findings.push(
        "Recruiting-Begriffe in der Domain."
      );
    }

    if (
      (domain.match(/-/g) || [])
        .length >= 2
    ) {
      score -= 10;

      findings.push(
        "Viele Bindestriche in der Domain."
      );
    }

    if (/\d/.test(domain)) {
      score -= 8;

      findings.push(
        "Zahlen in der Domain."
      );
    }

    // RDAP
    try {
      const rdapRes = await fetch(
        "https://rdap.org/domain/" +
        domain
      );

      if (!rdapRes.ok) {
        throw new Error();
      }

      const rdap = await rdapRes.json();

      const created = getEventDate(
        rdap.events,
        "registration"
      );

      if (created && !isNaN(created)) {

        createdText =
          created.toLocaleDateString(
            "de-DE"
          );

        ageDays = Math.floor(
          (new Date() - created) /
          (1000 * 60 * 60 * 24)
        );

        if (ageDays < 30) {
          score -= 70;

          findings.push(
            "HOCHRISIKANT: Domain jünger als 30 Tage."
          );

        } else if (ageDays < 180) {
          score -= 35;

          findings.push(
            "Riskant: Domain jünger als 6 Monate."
          );

        } else if (ageDays < 365) {
          score -= 20;

          findings.push(
            "Auffällig: Domain jünger als 1 Jahr."
          );
        }

      } else {
        score -= 25;

        findings.push(
          "Kein verlässliches Registrierungsdatum gefunden."
        );
      }

      registrar = getRegistrar(rdap);
      nameservers =
        getNameservers(rdap);

      if (
        registrar ===
        "nicht gefunden"
      ) {
        score -= 15;

        findings.push(
          "Registrar nicht öffentlich sichtbar."
        );

      } else {

        findings.push(
          "Registrar: " +
          registrar
        );

        if (
          containsFromList(
            registrar,
            riskyRegistrars
          )
        ) {
          score -= 25;

          findings.push(
            "Registrar steht auf interner Risikoliste."
          );
        }

        if (
          containsFromList(
            registrar,
            normalizedSpamhausProviders
          )
        ) {
          score -= 25;

          findings.push(
            "Registrar/Provider steht auf Spamhaus-Risikoliste."
          );
        }
      }

      if (nameservers.length > 0) {

        findings.push(
          "Nameserver: " +
          nameservers.join(", ")
        );

        const nsText =
          nameservers.join(" ");

        if (
          containsFromList(
            nsText,
            riskyNameservers
          )
        ) {
          score -= 25;

          findings.push(
            "Auffällige Nameserver erkannt."
          );
        }

        if (
          containsFromList(
            nsText,
            normalizedSpamhausProviders
          )
        ) {
          score -= 25;

          findings.push(
            "Nameserver/Provider steht auf Spamhaus-Risikoliste."
          );
        }

      } else {
        score -= 25;

        findings.push(
          "Keine Nameserver gefunden."
        );
      }

    } catch (e) {
      score -= 35;

      findings.push(
        "RDAP/WHOIS-Daten konnten nicht geprüft werden."
      );
    }

    // DNS / IP
    try {

      const dnsRes = await fetch(
        "https://dns.google/resolve?name=" +
        domain +
        "&type=A"
      );

      const dns =
        await dnsRes.json();

      const record =
        dns.Answer?.find(
          a => a.type === 1
        );

      if (
        record?.data &&
        isValidPublicIp(record.data)
      ) {

        ip = record.data;
        ipText = ip;

        findings.push(
          "IP-Adresse: " + ip
        );

        findings.push(
          "AbuseIPDB prüfen: https://www.abuseipdb.com/check/" + ip
        );

        if (
          riskyIps.includes(ip)
        ) {
          score -= 60;

          findings.push(
            "KRITISCH: IP-Adresse steht auf interner Abuse-/Blacklist."
          );
        }

        if (
          riskyIpRanges.some(
            range =>
              ip.startsWith(range)
          )
        ) {
          score -= 40;

          findings.push(
            "KRITISCH: IP-Bereich steht auf interner Abuse-/Blacklist."
          );
        }

        try {

          const ipRes =
            await fetch(
              "https://rdap.org/ip/" +
              ip
            );

          if (ipRes.ok) {

            const ipData =
              await ipRes.json();

            if (ipData.name) {
              hosting =
                ipData.name;
            }

            if (
              ipData.entities &&
              ipData.entities.length > 0
            ) {
              const org =
                ipData.entities[0]
                  .vcardArray?.[1]
                  ?.find(
                    v =>
                      v[0] === "fn"
                  );

              if (org) {
                hosting =
                  org[3];
              }
            }

            findings.push(
              "Hosting/Netzwerk: " +
              hosting
            );

            if (
              containsFromList(
                hosting,
                riskyHosting
              )
            ) {
              score -= 25;

              findings.push(
                "Hosting/Netzwerk steht auf interner Risikoliste."
              );
            }

            if (
              containsFromList(
                hosting,
                normalizedSpamhausProviders
              )
            ) {
              score -= 25;

              findings.push(
                "Hosting/Netzwerk steht auf Spamhaus-Risikoliste."
              );
            }
          }

        } catch (e) {
          score -= 10;

          findings.push(
            "Hosting/Netzwerk konnte nicht geprüft werden."
          );
        }

      } else {

        score -= 35;

        findings.push(
          "Keine gültige öffentliche IP ermittelbar."
        );
      }

    } catch (e) {

      score -= 35;

      findings.push(
        "DNS/IP/Hosting konnte nicht geprüft werden."
      );
    }

    if (
      registrar ===
      "nicht gefunden" &&
      nameservers.length === 0 &&
      !ip
    ) {
      score =
        Math.min(score, 35);

      findings.push(
        "KRITISCH: Keine WHOIS-/DNS-Daten vorhanden."
      );
    }

    score = Math.max(
      0,
      Math.min(100, score)
    );

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
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow p-8">

        <h1 className="text-3xl font-bold mb-2">
          Domain Risiko Checker
        </h1>

        <p className="text-slate-600 mb-6">
          Prüft Domainalter, Registrar,
          Nameserver, IP, Hosting
          und Abuse-Risiken.
        </p>

        <div className="flex gap-3">

          <input
            type="text"
            placeholder="firma.com oder mail@firma.com"
            value={input}
            onChange={(e) =>
              setInput(
                e.target.value
              )
            }
            className="flex-1 border rounded-xl px-4 py-3"
          />

          <button
            onClick={
              analyzeDomain
            }
            className="bg-black text-white px-5 rounded-xl"
          >
            {loading
              ? "Prüfe..."
              : "Prüfen"}
          </button>

        </div>

        {result && (
          <div className="mt-8">

           <div
  className={
    "text-2xl font-bold mb-2 px-4 py-2 rounded-xl inline-block " +
    (
      result.status === "Kritisch"
        ? "bg-red-100 text-red-700 border border-red-300"
        : result.status === "Neutral / prüfen"
        ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
        : "bg-green-100 text-green-700 border border-green-300"
    )
  }
>
  Ergebnis: {result.status}
</div>

            <div
  className={
    "mb-4 font-semibold " +
    (
      result.score < 45
        ? "text-red-700"
        : result.score < 75
        ? "text-yellow-700"
        : "text-green-700"
    )
  }
>
  Score: {result.score}/100
</div>

            <div className="bg-slate-100 rounded-xl p-4 mb-4 space-y-1">

              <div>
                <b>Domain:</b>
                {" "}
                {result.domain}
              </div>

              <div>
                <b>Registriert seit:</b>
                {" "}
                {result.createdText}
              </div>

              <div>
                <b>Alter:</b>
                {" "}
                {result.ageDays !== null
                  ? result.ageDays + " Tage"
                  : "nicht gefunden"}
              </div>

              <div>
                <b>Registrar:</b>
                {" "}
                {result.registrar}
              </div>

              <div>
                <b>Nameserver:</b>
                {" "}
                {result.nameservers.length
                  ? result.nameservers.join(", ")
                  : "nicht gefunden"}
              </div>

              <div>
                <b>IP:</b>
                {" "}
                {result.ipText}
              </div>

              <div>
                <b>Hosting:</b>
                {" "}
                {result.hosting}
              </div>

            </div>

            <div className="bg-slate-100 rounded-xl p-4">

              <div className="font-semibold mb-2">
                Hinweise:
              </div>

              <ul className="list-disc ml-5">

                {result.findings.map(
                  (f, i) => (
                    <li key={i}>
                      {f}
                    </li>
                  )
                )}

              </ul>

            </div>

            <div className="mt-4 text-sm text-slate-500">
              Hinweis:
              Diese Bewertung ist nur
              ein Risikosignal und kein Beweis.
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

ReactDOM
  .createRoot(
    document.getElementById("root")
  )
  .render(<App />);
