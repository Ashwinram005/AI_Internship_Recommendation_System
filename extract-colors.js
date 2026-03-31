import fs from 'fs';

const landingHtml = fs.readFileSync('./aida_landing.html', 'utf-8');
const loginHtml = fs.readFileSync('./aida_login.html', 'utf-8');

const extractColors = (html) => {
  const match = html.match(/colors:\s*({[^}]+})/);
  if (match) {
    return JSON.parse(match[1].replace(/"/g, '"').replace(/'/g, '"'));
  }
  return {};
};

const darkColors = extractColors(landingHtml);
const lightColors = extractColors(loginHtml);

let cssVariablesLight = ':root {\n';
for (const [key, value] of Object.entries(lightColors)) {
  cssVariablesLight += `  --stitch-${key}: ${value};\n`;
}
cssVariablesLight += '}\n\n';

let cssVariablesDark = '.dark {\n';
for (const [key, value] of Object.entries(darkColors)) {
  cssVariablesDark += `  --stitch-${key}: ${value};\n`;
}
cssVariablesDark += '}\n\n';

let themeBlock = '@theme inline {\n';
for (const key of Object.keys(lightColors)) {
  themeBlock += `  --color-stitch-${key}: var(--stitch-${key});\n`;
}
themeBlock += '}\n';

fs.writeFileSync('./src/stitch-theme.css', cssVariablesLight + cssVariablesDark + themeBlock);
console.log('Successfully generated src/stitch-theme.css');
