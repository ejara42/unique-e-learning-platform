import fs from 'fs';
import path from 'path';

interface CoverageRange {
  startOffset: number;
  endOffset: number;
  count: number;
}

interface CoverageFunction {
  functionName: string;
  ranges: CoverageRange[];
  isBlockCoverage: boolean;
}

interface ScriptCoverage {
  scriptId: string;
  url: string;
  functions: CoverageFunction[];
}

export function analyzeCoverage() {
  const covDir = path.resolve(process.cwd(), 'coverage');
  if (!fs.existsSync(covDir)) {
    console.log('No coverage directory found.');
    return;
  }

  const files = fs.readdirSync(covDir).filter(f => f.endsWith('.json'));
  const results: Record<string, { totalBytes: number; coveredBytes: number; totalFunctions: number; coveredFunctions: number }> = {};

  for (const file of files) {
    const raw = fs.readFileSync(path.join(covDir, file), 'utf8');
    const data = JSON.parse(raw);
    const scripts: ScriptCoverage[] = data.result || [];

    for (const s of scripts) {
      if (!s.url || !s.url.includes('/src/')) continue;
      const normalizedPath = s.url.replace(/^file:\/\/\/?/, '').replace(/\\/g, '/');
      const filename = normalizedPath.split('/src/')[1] ? `src/${normalizedPath.split('/src/')[1]}` : normalizedPath;

      if (!results[filename]) {
        results[filename] = { totalBytes: 0, coveredBytes: 0, totalFunctions: 0, coveredFunctions: 0 };
      }

      let scriptMax = 0;
      let covered = 0;

      for (const fn of s.functions) {
        results[filename].totalFunctions++;
        const fnCovered = fn.ranges.some(r => r.count > 0);
        if (fnCovered) results[filename].coveredFunctions++;

        for (const range of fn.ranges) {
          if (range.endOffset > scriptMax) scriptMax = range.endOffset;
          if (range.count > 0) {
            covered += (range.endOffset - range.startOffset);
          }
        }
      }

      results[filename].totalBytes = Math.max(results[filename].totalBytes, scriptMax);
      results[filename].coveredBytes = Math.max(results[filename].coveredBytes, covered);
    }
  }

  console.log('\n========================================================================');
  console.log('📊 MEASURED V8 CODE COVERAGE (ARTIFACT EVIDENCE)');
  console.log('========================================================================');
  console.log(String('File').padEnd(45) + String('Function %').padEnd(16) + 'Byte / Block %');
  console.log('------------------------------------------------------------------------');

  for (const [file, stats] of Object.entries(results)) {
    const fnPct = stats.totalFunctions ? Math.round((stats.coveredFunctions / stats.totalFunctions) * 100) : 0;
    const blockPct = stats.totalBytes ? Math.min(100, Math.round((stats.coveredBytes / stats.totalBytes) * 100)) : 0;
    console.log(
      String(file).padEnd(45) +
      String(`${fnPct}% (${stats.coveredFunctions}/${stats.totalFunctions})`).padEnd(16) +
      `${blockPct}%`
    );
  }
  console.log('========================================================================\n');
}

analyzeCoverage();

