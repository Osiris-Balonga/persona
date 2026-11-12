export function decisionSteps(currentStatus, decision, changed, visualOnly, collectionChanged = false) {
  const collection = collectionChanged ? ["collection"] : [];
  if (currentStatus === decision && !changed) return collection;
  if (currentStatus === decision && visualOnly)
    return [...collection, "visual"];
  if (changed) return [...collection, "metadata", "decide"];
  if (currentStatus === "approved" || currentStatus === "rejected")
    return [...collection, "reopen", "decide"];
  return [...collection, "decide"];
}
