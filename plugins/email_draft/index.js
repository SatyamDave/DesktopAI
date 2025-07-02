const { shell, clipboard } = require('electron');

const manifest = {
  name: "email_draft",
  description: "Compose and send emails",
  parametersSchema: {
    type: "object",
    properties: {
      recipient: {
        type: "string",
        description: "Email address of the recipient"
      },
      subject: {
        type: "string",
        description: "Subject line of the email"
      },
      body: {
        type: "string",
        description: "Body content of the email"
      },
      tone: {
        type: "string",
        description: "Tone of the email (professional, casual, formal, friendly)",
        default: "professional"
      },
      useClipboard: {
        type: "boolean",
        description: "Use clipboard content as email body if no body provided",
        default: true
      }
    },
    required: ["recipient"]
  },
  version: "1.0.0",
  author: "Friday Team"
};

async function run(args, context) {
  try {
    // Validate email address
    if (!isValidEmail(args.recipient)) {
      return {
        success: false,
        message: `Invalid email address: ${args.recipient}`,
        error: 'INVALID_EMAIL'
      };
    }

    // Get email body
    let body = args.body;
    if (!body && args.useClipboard !== false) {
      body = clipboard.readText() || '';
      if (body) {
        body = `Content from clipboard:\n\n${body}`;
      }
    }

    // Generate subject if not provided
    let subject = args.subject;
    if (!subject) {
      if (body) {
        subject = generateSubjectFromBody(body);
      } else {
        subject = 'New Message';
      }
    }

    // Format body based on tone
    const formattedBody = formatBodyByTone(body || 'No content provided', args.tone || 'professional');

    // Create mailto URL
    const mailtoUrl = createMailtoUrl({
      to: args.recipient,
      subject,
      body: formattedBody
    });

    // Open default email client
    await shell.openExternal(mailtoUrl);

    return {
      success: true,
      message: `Opened email client to compose message to ${args.recipient}`,
      summary: `Email draft created for ${args.recipient}`,
      data: {
        recipient: args.recipient,
        subject,
        bodyLength: formattedBody.length,
        tone: args.tone || 'professional',
        mailtoUrl
      }
    };

  } catch (error) {
    return {
      success: false,
      message: `Failed to create email draft: ${error}`,
      error: String(error)
    };
  }
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function generateSubjectFromBody(body) {
  // Simple subject generation from first line or first few words
  const lines = body.split('\n').filter(line => line.trim().length > 0);
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    if (firstLine.length <= 50) {
      return firstLine;
    } else {
      return firstLine.substring(0, 47) + '...';
    }
  }
  return 'New Message';
}

function formatBodyByTone(body, tone) {
  const tonePrefixes = {
    professional: 'Dear Sir/Madam,\n\n',
    casual: 'Hi there!\n\n',
    formal: 'Dear Sir/Madam,\n\n',
    friendly: 'Hello!\n\n'
  };

  const toneSuffixes = {
    professional: '\n\nBest regards,\n[Your Name]',
    casual: '\n\nCheers!',
    formal: '\n\nYours faithfully,\n[Your Name]',
    friendly: '\n\nBest wishes,\n[Your Name]'
  };

  const prefix = tonePrefixes[tone] || '';
  const suffix = toneSuffixes[tone] || '';

  return `${prefix}${body}${suffix}`;
}

function createMailtoUrl(params) {
  const url = new URL('mailto:' + params.to);
  
  if (params.subject) {
    url.searchParams.set('subject', params.subject);
  }
  
  if (params.body) {
    url.searchParams.set('body', params.body);
  }
  
  return url.toString();
}

module.exports.manifest = manifest;
module.exports.run = run; 