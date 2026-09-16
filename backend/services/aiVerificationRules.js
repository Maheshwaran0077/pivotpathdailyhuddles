/**
 * AI Problem-Analysis Rules Layer
 * Provides domain-specific visual analysis rules, category-specific evaluation criteria,
 * and dynamic prompt building for the Gemini Vision Resolution Verification Engine.
 */

const CATEGORY_RULES = {
  // 1. Equipment & Maintenance / Machine Failure
  'Equipment / Maintenance': {
    categoryKey: 'EQUIPMENT_MAINTENANCE',
    keywords: ['machine', 'equipment', 'breakdown', 'leak', 'oil', 'lubricant', 'motor', 'guard', 'wiring', 'pipe', 'valve', 'gauge', 'conveyor', 'seal', 'pump'],
    visualChecklist: [
      'Visible liquid leakage (oil, water, coolant, lubricant) in before image vs clean/dry containment in after image',
      'Presence of broken, loose, disconnected, or missing mechanical/electrical components before vs firmly repaired/replaced after',
      'Machine safety guards / shields removed or open before vs correctly installed and secured after',
      'Exposed wiring or burnt terminal blocks before vs properly insulated/routed after',
      'Physical location, machine asset tags, surrounding structure, and operational surface matching between both images'
    ],
    specificCriteria: 'Scrutinize whether fluid stains are actively cleaned up or merely covered/hidden. Verify that repaired parts are structurally secure and that the exact machine section shown in the Before image is photographed in the After image.'
  },

  // 2. Safety & Housekeeping / 5S / Obstructions
  'Safety & Housekeeping': {
    categoryKey: 'SAFETY_HOUSEKEEPING',
    keywords: ['safety', 'housekeeping', 'floor', 'scattered', 'spill', 'pathway', 'gangway', 'clutter', '5s', 'obstruction', 'trash', 'debris', 'trip', 'hazard', 'pedestrian', 'fire exit'],
    visualChecklist: [
      'Scattered materials, boxes, tools, or debris obstructing floor pathways / walkways before vs clearly organized or cleared floor after',
      'Spills, wet spots, powders, or loose substances on walkways before vs dry, cleaned floor surface after',
      'Blocked emergency exits, fire extinguishers, electrical panels, or eyewash stations before vs clear unobstructed access after',
      'Floor demarcation / line markings visible and respected in after image',
      'Identical floor area, background pillars, signage, or equipment footprint in both Before and After images'
    ],
    specificCriteria: 'Confirm that clutter or hazards were genuinely removed from the reported location rather than moved to an adjacent spot within the same walkway. Confirm floor dry status.'
  },

  // 3. Quality & Process / Defects / Packaging
  'Quality & Defects': {
    categoryKey: 'QUALITY_DEFECTS',
    keywords: ['quality', 'defect', 'damage', 'scratch', 'label', 'seal', 'packaging', 'dimension', 'contamination', 'foreign particulate', 'gdp', 'deviation', 'sop', 'batch', 'cap', 'carton', 'blister'],
    visualChecklist: [
      'Specific physical defect, damage, misprint, discoloration, or seal imperfection visible before vs correct defect-free presentation after',
      'Proper labeling, alignment, expiry/batch details, and barcode readability in after image',
      'Foreign matter, dust, or contamination present before vs sterile/cleaned condition after',
      'Part/product orientation matches specified packaging standards'
    ],
    specificCriteria: 'Inspect whether the defect was rectified according to quality norms or if the after image shows a completely different batch/part without evidence of corrective process.'
  },

  // 4. Material Handling & Warehouse
  'Material & Warehouse': {
    categoryKey: 'MATERIAL_WAREHOUSE',
    keywords: ['warehouse', 'pallet', 'stack', 'rack', 'forklift', 'material', 'storage', 'drum', 'container', 'shrink wrap', 'damaged pallet', 'overhang'],
    visualChecklist: [
      'Unstable, damaged, leaning, or improperly stacked pallets/drums before vs restacked, secured, and aligned storage after',
      'Damaged packaging or torn stretch wrap before vs shrink-wrapped, intact packaging after',
      'Materials stored outside designated bays/racks before vs stored within designated warehouse locations after'
    ],
    specificCriteria: 'Ensure pallet stability and correct rack placement. Verify that the same warehouse aisle/bay is visible.'
  },

  // 5. Facilities & Environment (EHS, Lighting, Power, Ventilation)
  'Facilities & Environment': {
    categoryKey: 'FACILITIES_ENVIRONMENT',
    keywords: ['power', 'light', 'ventilation', 'ac', 'hvac', 'drain', 'roof', 'wall', 'door', 'water', 'lighting', 'exhaust', 'civil'],
    visualChecklist: [
      'Broken fixtures, flickering lights, exposed conduits, or water dripping before vs repaired fixture/surface after',
      'Blocked drains or overflowing sumps before vs clear flowing drainage after',
      'Damaged walls, ceiling tiles, or loose ductwork before vs structurally restored facility after'
    ],
    specificCriteria: 'Verify structural repairs and adequate illumination/containment in the after image.'
  },

  // 6. Generic / Other Operational Issues
  'General Operations': {
    categoryKey: 'GENERAL_OPERATIONS',
    keywords: ['other', 'general', 'process delay', 'manpower', 'tool', 'workspace'],
    visualChecklist: [
      'Problem state clearly visible in Before image matching challenge description',
      'Corrective action clearly demonstrated in After image',
      'Before and After images display the same workspace, machine, or operational context',
      'No lingering visual abnormalities or remaining hazards'
    ],
    specificCriteria: 'Perform conservative visual evaluation verifying that the problem state described in the challenge is resolved in the After image.'
  }
};

/**
 * Categorize a challenge based on its fields
 */
function resolveCategory(challenge) {
  const text = `${challenge.alertIncidentType || ''} ${challenge.errorType || ''} ${challenge.description || ''} ${challenge.department || ''}`.toLowerCase();

  for (const [name, rule] of Object.entries(CATEGORY_RULES)) {
    if (name === 'General Operations') continue;
    const match = rule.keywords.some(k => text.includes(k));
    if (match) return { categoryName: name, rules: rule };
  }

  return { categoryName: 'General Operations', rules: CATEGORY_RULES['General Operations'] };
}

/**
 * Builds problem-specific prompt instructions for Gemini Vision
 */
function buildProblemSpecificPrompt(challenge, categoryInfo) {
  const { categoryName, rules } = categoryInfo;
  const description = challenge.description || 'No description provided';
  const alertType = challenge.alertIncidentType || (challenge.alertTypes && challenge.alertTypes[0]) || 'General Incident';
  const errorType = challenge.errorType || 'Process Error';
  const department = challenge.department || 'Production';
  const shift = challenge.shift || '1';
  const actionNotes = challenge.actionNotes || 'Corrective action taken';

  return `
You are an expert industrial Quality, Health, Safety, Environment (QHSE) and FDA Regulatory Compliance Vision Inspector.
Your objective is to determine whether a reported plant challenge has ACTUALLY been resolved by analyzing Before and After evidence images.

=== REPORTED CHALLENGE METADATA ===
• Tracker ID: ${challenge.trackerId || challenge.id || 'N/A'}
• Department: ${department}
• Shift: ${shift}
• Incident Type: ${alertType}
• Error Classification: ${errorType}
• Problem Category: ${categoryName}
• Original Problem Description: "${description}"
• Logged Corrective Action: "${actionNotes}"

=== PROBLEM-SPECIFIC INSPECTION CHECKLIST FOR [${categoryName}] ===
${rules.visualChecklist.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}

=== SPECIFIC EVALUATION CRITERIA ===
${rules.specificCriteria}

=== MANDATORY ASSESSMENT INSTRUCTIONS ===
1. SAME LOCATION / AREA CHECK:
   - Carefully examine structural markers, machine boundaries, background walls, floor tiles, pipes, and visual landmarks.
   - If the Before and After images appear to show completely different areas, set "sameAreaConfidence" LOW (e.g. < 50), set "suspiciousEvidence": true, and set "verificationRecommendation": "REVIEW_REQUIRED".

2. BEFORE IMAGE ANALYSIS:
   - Does the Before image clearly show the problem described in "${description}"?
   - If the Before image is too dark, blurry, distant, or irrelevant to detect the problem, set "problemDetectedBefore": false and "resolutionAssessment": "INSUFFICIENT_EVIDENCE".

3. AFTER IMAGE ANALYSIS:
   - Does the After image clearly show that the problem has been corrected?
   - Are there remaining residues, loose wires, uncleaned oil, obstructions, or leftover hazards?
   - If the issue still persists, set "problemDetectedAfter": true, "remainingIssue": true, and "resolutionAssessment": "NOT_RESOLVED".
   - If only partially fixed, set "resolutionAssessment": "PARTIALLY_RESOLVED".

4. CONSERVATIVE EVIDENCE RULE:
   - NEVER assume an issue is fixed if the After image is blurry, cropped, dark, or photographed from an angle that hides the problem area.
   - If evidence is ambiguous, return "resolutionAssessment": "INSUFFICIENT_EVIDENCE".
   - Do NOT use phrases claiming "100% guaranteed fixed". Use conservative terminology ("Likely Resolved", "Partially Resolved", "Not Resolved", "Insufficient Evidence").

5. SCORING GUIDELINES (0 to 100 integer scale):
   - sameAreaConfidence: 0-100 (probability that both photos capture the exact same physical spot)
   - imageQualityScore: 0-100 (clarity, lighting, resolution, readability of both photos)
   - evidenceQualityScore: 0-100 (how relevant and convincing the photos are as proof of the challenge and resolution)
   - visualImprovementScore: 0-100 (degree of visual improvement from Before to After)
   - resolutionConfidence: 0-100 (overall confidence score in the resolution assessment)

Return your evaluation ONLY as a valid JSON object strictly conforming to the requested schema.
`;
}

module.exports = {
  CATEGORY_RULES,
  resolveCategory,
  buildProblemSpecificPrompt
};
