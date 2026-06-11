const serviceRole = process.env.SERVICE_ROLE?.trim().toLowerCase() ?? "bot";

if (serviceRole === "api") {
  const apiEntryPoint = "../api/server.js";
  void import(apiEntryPoint);
} else {
  void import("./server.js");
}
