// WhatsApp link generator with Hindi message templates
// Uses regular wa.me links — zero API cost

export const templates = {
  renewal_reminder: (memberName: string, expiryDate: string, gymName: string, upiId?: string) => {
    const upiLine = upiId ? `\nUPI: ${upiId}` : ''
    return `Namaste ${memberName} ji! 🙏\n\nAapki ${gymName} membership ${expiryDate} ko expire ho rahi hai.\n\nPlease renewal ke liye gym aayein ya online payment karein.${upiLine}\n\nDhanyavaad! 💪\n— ${gymName} (via RepCount)`
  },

  overdue_payment: (memberName: string, days: number, amount: number, gymName: string) =>
    `Hi ${memberName} ji,\n\nAapki ${gymName} membership ${days} din pehle expire ho gayi hai. Pending amount: ₹${amount}\n\nPlease jaldi se renew karein taaki aapki fitness journey continue rahe! 🏋️\n\n— ${gymName}`,

  inactive_checkin: (memberName: string, lastDays: number, gymName: string) =>
    `Hi ${memberName}! 👋\n\n${gymName} mein aapko dekhkar ${lastDays} din ho gaye. Sab theek hai?\n\nAapki fitness goal ke liye consistency bohot zaroori hai. Kal milte hain gym mein! 💪\n\n— ${gymName}`,

  welcome: (memberName: string, gymName: string, appLink: string) =>
    `Welcome to ${gymName}, ${memberName}! 🎉\n\nAapka RepCount account ready hai. Yahan se apna diet plan, workout plan aur attendance dekh sakte hain:\n\n${appLink}\n\n💪 Let's start your fitness journey!\n\n— ${gymName}`,

  birthday: (memberName: string, gymName: string) =>
    `Happy Birthday ${memberName}! 🎂🎉\n\n${gymName} ki taraf se aapko bohot bohot badhai!\n\nAaj ka din special hai — enjoy karein aur kal gym mein milte hain! 💪\n\n— ${gymName}`,
}

export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, '')
  const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`
}
