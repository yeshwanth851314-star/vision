export interface IRagChunk {
  chunkId: string;
  title: string;
  textContent: string;
}

export const STADIUM_KNOWLEDGE_BASE: IRagChunk[] = [
  {
    chunkId: "chunk_ops_restrooms",
    title: "Restrooms & Amenities Location",
    textContent: "The nearest restroom is located near Gate B4, Section 112 (Concourse Ring 1). Fully equipped with wheelchair access.",
  },
  {
    chunkId: "chunk_ops_ada_gate_w2",
    title: "Gate W2 ADA Safe Exit Route",
    textContent: "Gate W2 is our designated step-free ADA diversion exit. Follow the blue/cyan AR chevrons. Ramp slope is 1:12 maximum.",
  },
  {
    chunkId: "chunk_ops_emergency_evac",
    title: "Emergency Evacuation SOP",
    textContent: "In case of fire, weapon threat, or critical crowd crush hazard, evacuate immediately toward evacuation target safe gate. Follow green corridor lights.",
  },
  {
    chunkId: "chunk_ops_hvac_zones",
    title: "BMS HVAC & Energy Conservation",
    textContent: "Building Management System zone VIP_SUITE_A is scheduled for zero-occupancy energy saving. If headcount is 0 for 15+ minutes, throttle airflow to 50% and dim LED lighting to 20%.",
  },
  {
    chunkId: "chunk_ops_gate_hours",
    title: "Stadium Ingress & Gate Hours",
    textContent: "All stadium gates, including Gate B4 and Gate W2, open exactly 2 hours before kickoff for ticketed ingress checks.",
  }
];

export function retrieveGroundedContext(queryText: string): string {
  const words = queryText.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  const scoredChunks = STADIUM_KNOWLEDGE_BASE.map(chunk => {
    let score = 0;
    const contentLower = chunk.textContent.toLowerCase();
    const titleLower = chunk.title.toLowerCase();
    
    for (const word of words) {
      if (contentLower.includes(word)) score += 1;
      if (titleLower.includes(word)) score += 2; // Weight title match higher
    }
    
    return { chunk, score };
  });
  
  // Sort by score descending and take top 2 scoring chunks (score must be > 0)
  const topChunks = scoredChunks
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(item => `[Source: ${item.chunk.title}] ${item.chunk.textContent}`);
    
  return topChunks.join("\n\n");
}
