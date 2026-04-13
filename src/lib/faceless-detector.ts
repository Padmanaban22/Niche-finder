export interface FacelessScoreDetails {
  score: number;
  level: 'High' | 'Medium' | 'Low';
}

export function detectFacelessChannel(
  description: string,
  latestVideoTitles: string[],
  categoryName: string,
  avgDurationMinutes: number,
  uploadsPerWeek: number
): FacelessScoreDetails {
  let score = 0;

  // 1. Description Keywords (+30 points)
  const descriptionKeywords = [
    'no face', 'faceless', 'stock footage', 'ai voice',
    'text-to-speech', 'animated', 'compilation', 'generated',
    'whiteboard', 'storytelling', 'reddit stories', 'minecraft parkour'
  ];
  
  const lowerDesc = (description || '').toLowerCase();
  for (const kw of descriptionKeywords) {
    if (lowerDesc.includes(kw)) {
      score += 30;
      break; 
    }
  }

  // 2. Video Title Patterns (+20 points)
  const titlePatterns = [
    /top \d+/i,
    /did you know/i,
    /facts about/i,
    /how to \w+ in \d+ \w+/i,
    /explained in \d+ minutes/i,
    /history of/i,
    /relaxing/i,
    /rain sounds/i,
    /ambient/i,
    /lofi/i,
    /compilation/i,
    /tier list/i
  ];
  
  let matchCount = 0;
  for (const title of latestVideoTitles) {
    for (const pattern of titlePatterns) {
      if (pattern.test(title)) {
        matchCount++;
        break;
      }
    }
  }
  
  if (latestVideoTitles.length > 0) {
    const patternRatio = matchCount / latestVideoTitles.length;
    if (patternRatio > 0.3) {
      score += 20; 
    } else if (patternRatio > 0.1) {
      score += 10;
    }
  }

  // 3. Category Check (+20 points)
  const facelessCategories = [
    'Education', 'Entertainment', 'Music', 'Film & Animation', 
    'Science & Technology', 'Gaming'
  ];
  
  if (facelessCategories.includes(categoryName)) {
    score += 20;
  }

  // 4. Average Duration (+15 points)
  // (8-20 minutes for listicles, 60+ minutes for ambient)
  // For shorts, duration is usually < 1 min, but the user is focusing on Shorts RPM. 
  // Let's add shorts logic: heavily 0-1 min means shorts channel.
  if (avgDurationMinutes < 1) {
    // Shorts channels are very often faceless (reddit stories, facts, etc.)
    score += 10; 
  } else if ((avgDurationMinutes >= 8 && avgDurationMinutes <= 20) || avgDurationMinutes >= 60) {
    score += 15;
  }

  // 5. Upload frequency (+15 points) -> > 5x per week
  if (uploadsPerWeek >= 5) {
    score += 15;
  }

  score = Math.min(score, 100);

  let level: 'High' | 'Medium' | 'Low' = 'Low';
  if (score >= 70) level = 'High';
  else if (score >= 40) level = 'Medium';

  return { score, level };
}
