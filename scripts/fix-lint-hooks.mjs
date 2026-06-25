import fs from 'fs';

const pageFile = 'app/page.tsx';
let pageContent = fs.readFileSync(pageFile, 'utf8');

const hookStr = `  useEffect(() => {
    if (isSuperAdmin === undefined) return; 
    
    if (isSuperAdmin) {
      loadApiData();
    } else {
      loadOfflineData();
    }
  }, [selectedFarm, isSuperAdmin]);`;

pageContent = pageContent.replace(hookStr, '');

const insertTarget = `      router.push(\`/?farm_id=\${newFarmId}\`);
  };`;

pageContent = pageContent.replace(insertTarget, insertTarget + `\n\n  useEffect(() => {
    if (isSuperAdmin === undefined) return; 
    
    if (isSuperAdmin) {
      loadApiData();
    } else {
      loadOfflineData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFarm, isSuperAdmin]);`);

// Remove TrendingUp import
pageContent = pageContent.replace(', TrendingUp', '');

fs.writeFileSync(pageFile, pageContent);

const reportsFile = 'app/reports/page.tsx';
let reportsContent = fs.readFileSync(reportsFile, 'utf8');
reportsContent = reportsContent.replace('generateLocalReport();', 'queueMicrotask(() => generateLocalReport());');
fs.writeFileSync(reportsFile, reportsContent);
