/**
 * Shared candidate data extraction helpers for location, experience, and notice period.
 */

export function getCandidateLocation(c) {
  if (!c) return '—';
  if (c.extractedData?.currentLocation && String(c.extractedData.currentLocation).trim() !== '') {
    return c.extractedData.currentLocation;
  }
  const formAnswers = c.extractedData?.formAnswers || [];
  const locAns = formAnswers.find(a => a.label && a.label.toLowerCase().includes('location'));
  if (locAns && locAns.value && String(locAns.value).trim() !== '') {
    return locAns.value;
  }
  if (c.location && String(c.location).trim() !== '') {
    return c.location;
  }
  return '—';
}

export function getCandidateExperience(c) {
  if (!c) return '—';
  if (c.extractedData?.totalYearsExperience != null && c.extractedData?.totalYearsExperience !== '') {
    const val = String(c.extractedData.totalYearsExperience).trim();
    if (val !== '0' && val !== '') {
      return val.toLowerCase().includes('yr') ? val : `${val} yrs`;
    }
  }
  const formAnswers = c.extractedData?.formAnswers || [];
  const expAns = formAnswers.find(a => a.label && a.label.toLowerCase().includes('experience'));
  if (expAns && expAns.value && String(expAns.value).trim() !== '') {
    const val = String(expAns.value).trim();
    return val.toLowerCase().includes('yr') ? val : `${val} yrs`;
  }
  // Calculate from experience array if available
  if (c.experience && Array.isArray(c.experience) && c.experience.length > 0) {
    let totalMonths = 0;
    c.experience.forEach(exp => {
      if (exp.duration) {
        const dur = String(exp.duration).toLowerCase();
        const yearsMatch = dur.match(/(\d+)\s*(?:yrs|years|yr)/);
        const mosMatch = dur.match(/(\d+)\s*(?:mos|months|mo)/);
        if (yearsMatch) totalMonths += parseInt(yearsMatch[1], 10) * 12;
        if (mosMatch) totalMonths += parseInt(mosMatch[1], 10);
      }
    });
    if (totalMonths > 0) {
      const yrs = Math.floor(totalMonths / 12);
      const mos = totalMonths % 12;
      let str = '';
      if (yrs > 0) str += `${yrs} yr${yrs > 1 ? 's' : ''}`;
      if (mos > 0) str += `${str ? ' ' : ''}${mos} mo${mos > 1 ? 's' : ''}`;
      return str;
    }
  }
  return '—';
}

export function getCandidateNoticePeriod(c) {
  if (!c) return '—';
  if (c.extractedData?.noticePeriod && String(c.extractedData.noticePeriod).trim() !== '') {
    return c.extractedData.noticePeriod;
  }
  const formAnswers = c.extractedData?.formAnswers || [];
  const noticeAns = formAnswers.find(a => a.label && a.label.toLowerCase().includes('notice'));
  if (noticeAns && noticeAns.value && String(noticeAns.value).trim() !== '') {
    return noticeAns.value;
  }
  return '—';
}
