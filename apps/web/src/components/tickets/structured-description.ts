export interface StructuredBugDescription {
  feature: string;
  devices: string;
  scenario: string;
  given: string;
  when: string;
  then: string;
  output: string;
}

export function serializeStructuredDescription(data: StructuredBugDescription): string {
  return [
    `**Feature**: ${data.feature.trim()}`,
    `**Devices**: ${data.devices.trim()}`,
    `**Scenario**: ${data.scenario.trim()}`,
    `**Given**: ${data.given.trim()}`,
    `**When**: ${data.when.trim()}`,
    `**Then**: ${data.then.trim()}`,
    `**Output**: ${data.output.trim()}`,
  ].join("\n\n");
}

export function parseStructuredDescription(
  desc: string | null | undefined,
): StructuredBugDescription | null {
  if (!desc || typeof desc !== "string") return null;

  const featureMatch = desc.match(
    /(?:\*\*Feature\*\*|Feature)\s*:\s*([\s\S]*?)(?=(?:\n\s*(?:\*\*Devices\*\*|Devices)\s*:|$))/i,
  );
  const devicesMatch = desc.match(
    /(?:\*\*Devices\*\*|Devices)\s*:\s*([\s\S]*?)(?=(?:\n\s*(?:\*\*Scenario\*\*|Scenario)\s*:|$))/i,
  );
  const scenarioMatch = desc.match(
    /(?:\*\*Scenario\*\*|Scenario)\s*:\s*([\s\S]*?)(?=(?:\n\s*(?:\*\*Given\*\*|Given)\s*:|$))/i,
  );
  const givenMatch = desc.match(
    /(?:\*\*Given\*\*|Given)\s*:\s*([\s\S]*?)(?=(?:\n\s*(?:\*\*When\*\*|When)\s*:|$))/i,
  );
  const whenMatch = desc.match(
    /(?:\*\*When\*\*|When)\s*:\s*([\s\S]*?)(?=(?:\n\s*(?:\*\*Then\*\*|Then)\s*:|$))/i,
  );
  const thenMatch = desc.match(
    /(?:\*\*Then\*\*|Then)\s*:\s*([\s\S]*?)(?=(?:\n\s*(?:\*\*Output\*\*|Output)\s*:|$))/i,
  );
  const outputMatch = desc.match(/(?:\*\*Output\*\*|Output)\s*:\s*([\s\S]*)$/i);

  if (
    featureMatch &&
    devicesMatch &&
    scenarioMatch &&
    givenMatch &&
    whenMatch &&
    thenMatch &&
    outputMatch
  ) {
    return {
      feature: featureMatch[1].trim(),
      devices: devicesMatch[1].trim(),
      scenario: scenarioMatch[1].trim(),
      given: givenMatch[1].trim(),
      when: whenMatch[1].trim(),
      then: thenMatch[1].trim(),
      output: outputMatch[1].trim(),
    };
  }

  return null;
}
