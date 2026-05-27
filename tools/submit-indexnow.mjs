const host = "moimani.ai";
const key = "a880a00f0b3c289c15baa51d8c1a23a2";
const keyLocation = `https://${host}/${key}.txt`;
const urls = [
  "https://moimani.ai/",
  "https://moimani.ai/privacy",
  "https://moimani.ai/cookie",
];

const endpoints = [
  "https://api.indexnow.org/indexnow",
  "https://yandex.com/indexnow",
];

async function submit(endpoint) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key,
      keyLocation,
      urlList: urls,
    }),
  });

  const text = await response.text();
  console.log(`${endpoint}: ${response.status} ${response.statusText}`);
  if (text.trim()) {
    console.log(text.trim());
  }

  if (!response.ok && response.status !== 202) {
    throw new Error(`${endpoint} rejected IndexNow submission`);
  }
}

for (const endpoint of endpoints) {
  await submit(endpoint);
}
