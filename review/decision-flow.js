export function decisionSteps(currentStatus, decision, changed, toneOnly, collectionChanged = false) {
  const collection = collectionChanged ? ["collection"] : [];
  if (currentStatus === decision && !changed) return collection;
  if (currentStatus === "approved" && decision === "approved" && toneOnly)
    return [...collection, "tone"];
  if (changed) return [...collection, "metadata", "decide"];
  if (currentStatus === "approved" || currentStatus === "rejected")
    return [...collection, "reopen", "decide"];
  return [...collection, "decide"];
}
