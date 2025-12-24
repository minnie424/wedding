export function getVoterKey() {
  if (typeof window === "undefined") return "";
  let key = localStorage.getItem("voter_key");
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem("voter_key", key);
  }
  return key;
}