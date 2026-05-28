import bcrypt from "bcryptjs";

const devHash = "$2b$10$AOJ.c/GwcEVgi7TTm1.Ce.hzp13Qy.j2DIdBq6mK3diZ6BsTcgON2";
const adminHash = "$2b$10$KflCqWpfKDAzfm7f.fOb6u5BUt1rLUvh1WK9JJtT1idyFjpGGwylG";
const bikashHash = "$2b$12$5lkvJnvqn6iZA8mtk7L93em.xN/CMWTesPp9/96cdaNLB2TnhHIRO";

const candidate = "User@123";

async function check() {
  console.log("Candidate Password:", candidate);
  console.log("Dev Hash Match:", await bcrypt.compare(candidate, devHash));
  console.log("Admin Hash Match:", await bcrypt.compare(candidate, adminHash));
  console.log("Bikash Hash Match:", await bcrypt.compare(candidate, bikashHash));
}

check();
