import { eq } from "drizzle-orm";
import { db, pool, schema } from "../src";

interface BugDetails {
  feature: string;
  devices: string;
  scenario: string;
  given: string;
  when: string;
  then: string;
  output: string;
}

function parseStructuredDescription(desc: string | null | undefined): BugDetails | null {
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

async function main() {
  console.log("Starting backfill for bug_details...");
  const bugTickets = await db
    .select({
      id: schema.tickets.id,
      headline: schema.tickets.headline,
      description: schema.tickets.description,
      bugDetails: schema.tickets.bugDetails,
    })
    .from(schema.tickets)
    .where(eq(schema.tickets.type, "bug"));

  console.log(`Found ${bugTickets.length} bug ticket(s).`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const bug of bugTickets) {
    if (bug.bugDetails) {
      console.log(`- Bug "${bug.headline}" already has bug_details. Skipping.`);
      skippedCount++;
      continue;
    }

    const parsed = parseStructuredDescription(bug.description);
    if (parsed) {
      await db
        .update(schema.tickets)
        .set({ bugDetails: parsed })
        .where(eq(schema.tickets.id, bug.id));
      console.log(`✓ Bug "${bug.headline}" parsed and updated successfully.`);
      updatedCount++;
    } else {
      console.log(`- Bug "${bug.headline}" does not match structured format. Left as null.`);
      skippedCount++;
    }
  }

  console.log(`\nBackfill complete! Updated: ${updatedCount}, Skipped/Null: ${skippedCount}`);
  await pool.end();
}

main().catch((err) => {
  console.error("Backfill error:", err);
  process.exit(1);
});
