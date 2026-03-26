const IST_SUFFIX = '+05:30'

export const toIstIso = (datePart: string, timePart: string) => {
  const safeTime = timePart.length === 5 ? `${timePart}:00` : timePart
  return `${datePart}T${safeTime}${IST_SUFFIX}`
}

export const parseStartDate = (rawDateTime: string, fallbackDate: string, fallbackTime: string) => {
  if (rawDateTime && rawDateTime.includes(' ')) {
    const [datePart, timePart] = rawDateTime.split(' ')
    return toIstIso(datePart, timePart)
  }

  return toIstIso(fallbackDate, fallbackTime)
}

export const addMinutesToIso = (iso: string, minutes: number) => {
  const date = new Date(iso)
  date.setMinutes(date.getMinutes() + minutes)
  return date.toISOString()
}

export const isClosed = (closesAtIst: string, now = new Date()) => {
  return now.getTime() >= new Date(closesAtIst).getTime()
}

export const toDisplayDate = (isoLikeDate: string) => {
  const date = new Date(isoLikeDate)
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export const countdownLabel = (targetIso: string, now = new Date()) => {
  const ms = new Date(targetIso).getTime() - now.getTime()

  if (ms <= 0) {
    return 'Closed'
  }

  const totalSeconds = Math.floor(ms / 1000)
  const totalMinutes = Math.floor(totalSeconds / 60)
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60
  const seconds = totalSeconds % 60

  if (days > 0) {
    return `${days}d ${hours}h left`
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m left`
  }

  if (totalMinutes < 10) {
    return `${minutes}m ${seconds}s left`
  }

  return `${minutes}m left`
}
