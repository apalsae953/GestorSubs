async function check() {
  const res = await fetch("https://gestor-subs-two.vercel.app/dashboard", { redirect: 'manual' });
  console.log("Status:", res.status);
  console.log("Headers:", Object.fromEntries(res.headers));
}
check();
