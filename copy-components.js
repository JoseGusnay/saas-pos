const fs = require('fs');
const path = require('path');

function copyReplace(src, dest, replacements) {
  if (!fs.existsSync(src)) {
    console.error('Source does not exist: ' + src);
    return;
  }
  
  if (fs.statSync(src).isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(file => {
      const newFile = file.replace(/brand/g, 'presentation').replace(/Brand/g, 'Presentation');
      copyReplace(path.join(src, file), path.join(dest, newFile), replacements);
    });
  } else {
    let content = fs.readFileSync(src, 'utf8');
    replacements.forEach(([from, to]) => {
      content = content.replace(from, to);
    });
    fs.writeFileSync(dest, content);
    console.log('Created ' + dest);
  }
}

const reps = [
  [/BrandService/g, 'PresentationService'],
  [/BrandQueryParams/g, 'PresentationQueryParams'],
  [/BrandQueryFilters/g, 'PresentationQueryFilters'],
  [/brand\.models/g, 'presentation.models'],
  [/brand\.service/g, 'presentation.service'],
  [/brand-detail/g, 'presentation-detail'],
  [/brand-form/g, 'presentation-form'],
  [/brand-import-modal/g, 'presentation-import-modal'],
  [/brand-advanced-filters/g, 'presentation-advanced-filters'],
  [/brands-list/g, 'presentations-list'],
  [/brandId/g, 'presentationId'],
  [/brand/g, 'presentation'],
  [/Brand/g, 'Presentation'],
  [/BRAND/g, 'PRESENTATION'],
  [/marcas/g, 'presentaciones'],
  [/Marcas/g, 'Presentaciones'],
  [/marca/g, 'presentación'],
  [/Marca/g, 'Presentación']
];

copyReplace('src/app/features/inventory/pages/brands-list', 'src/app/features/inventory/pages/presentations-list', reps);
copyReplace('src/app/features/inventory/components/brand-form', 'src/app/features/inventory/components/presentation-form', reps);
copyReplace('src/app/features/inventory/components/brand-detail', 'src/app/features/inventory/components/presentation-detail', reps);
copyReplace('src/app/features/inventory/components/brand-import-modal', 'src/app/features/inventory/components/presentation-import-modal', reps);
