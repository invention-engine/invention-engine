const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  files.forEach(file => {
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);
    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursiveSync(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
    }
  });
}

async function run() {
  console.log("Starting Asset Pipeline Compiler...");

  // 1. Load world configuration
  const worldPath = path.resolve(__dirname, '../game/config/world.json');
  if (!fs.existsSync(worldPath)) {
    console.error("Error: game/config/world.json not found!");
    process.exit(1);
  }

  const worldData = JSON.parse(fs.readFileSync(worldPath, 'utf8'));
  const worldName = worldData.lore.worldName || "Aerthos";
  const worldEra = worldData.lore.era || "First Era";
  const gameSlug = slugify(worldName);
  const sandboxedDir = path.resolve(__dirname, `../games/${gameSlug}`);

  console.log(`World Name: ${worldName}`);
  console.log(`Era: ${worldEra}`);
  console.log(`Target Sandbox: games/${gameSlug}/`);

  // 2. Create Sandboxed Directory Structure
  if (fs.existsSync(sandboxedDir)) {
    fs.rmSync(sandboxedDir, { recursive: true, force: true });
  }
  fs.mkdirSync(sandboxedDir, { recursive: true });

  // 3. Copy files
  console.log("Copying core files...");
  fs.copyFileSync(path.resolve(__dirname, '../index.css'), path.join(sandboxedDir, 'index.css'));
  copyFolderRecursiveSync(path.resolve(__dirname, '../src'), path.join(sandboxedDir, 'src'));
  copyFolderRecursiveSync(path.resolve(__dirname, '../game'), path.join(sandboxedDir, 'game'));

  // 4. Inject Title & Description into index.html
  console.log("Injecting assets & config to index.html...");
  let htmlContent = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  
  // Replace title and description tags
  htmlContent = htmlContent.replace(/<title>.*<\/title>/i, `<title>${worldName} (${worldEra} Edition)</title>`);
  htmlContent = htmlContent.replace(
    /<meta name="description" content=".*">/i,
    `<meta name="description" content="An open world adventure in the lands of ${worldName} during the ${worldEra}.">`
  );

  fs.writeFileSync(path.join(sandboxedDir, 'index.html'), htmlContent, 'utf8');

  // 5. Standalone Production Build
  console.log("Running production compilation...");
  const outDir = path.resolve(__dirname, `../dist/games/${gameSlug}`);
  
  // Run Vite build targeting the sandboxed directory index.html
  try {
    execSync(`yarn vite build "${sandboxedDir}" --outDir "${outDir}" --emptyOutDir`, { stdio: 'inherit' });
    console.log(`Build successful! Target output: dist/games/${gameSlug}`);
  } catch (error) {
    console.error("Vite build compilation failed:", error);
    process.exit(1);
  }

  // 6. Generate lightweight ZIP archive
  console.log("Compressing standalone game package...");
  const zipPath = path.resolve(__dirname, `../dist/games/${gameSlug}.zip`);
  
  try {
    // Check if tar command exists and run it
    execSync(`tar -a -c -f "${zipPath}" -C "${outDir}" .`, { stdio: 'inherit' });
    console.log(`Zip archive compiled successfully! Location: dist/games/${gameSlug}.zip`);
  } catch (error) {
    console.warn("tar command failed or not supported. Falling back to PowerShell Compress-Archive...");
    try {
      execSync(`powershell -Command "Compress-Archive -Path '${outDir}/*' -DestinationPath '${zipPath}' -Force"`, { stdio: 'inherit' });
      console.log(`Zip archive compiled successfully via PowerShell! Location: dist/games/${gameSlug}.zip`);
    } catch (psError) {
      console.error("PowerShell zip compression failed:", psError);
      process.exit(1);
    }
  }

  console.log("Pipeline processing completed successfully.");
}

run();
