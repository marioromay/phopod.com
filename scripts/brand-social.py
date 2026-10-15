"""Render the code-native Phopod social card, using the approved robot unchanged."""
from pathlib import Path
import base64,subprocess
root=Path(__file__).resolve().parents[1]
robot=base64.b64encode((root/'brand/inspector-focus.png').read_bytes()).decode()
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#f5f5f2"/>
<path d="M52 52H1148M52 547H1148" stroke="#111" stroke-width="2"/>
<g fill="#111" font-family="Helvetica,Arial,sans-serif">
<text x="54" y="230" font-size="100" font-weight="800" letter-spacing="-5">PHOPOD<tspan fill="#d7352b">.</tspan></text>
<path d="M58 280H136" stroke="#d7352b" stroke-width="5"/>
<text x="58" y="342" font-size="27">Your photographic assistant.</text>
<text x="58" y="386" font-size="23" fill="#626262">Before. During. After the shoot.</text>
<text x="58" y="586" font-size="20">PHOPOD / PHOTOGRAPHY TOOLS</text>
<text x="1144" y="586" text-anchor="end" font-size="20" fill="#626262">By Mario Romay</text>
</g><image href="data:image/png;base64,{robot}" x="742" y="136" width="390" height="350"/>
</svg>'''
(root/'brand/phopod-social.svg').write_text(svg.replace('data:image/png;base64,'+robot,'inspector-focus.png'))
node="""const fs=require('fs');const sharp=require(require.resolve('sharp',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd()]}));sharp(fs.readFileSync(0)).png().toFile(process.argv[1]).catch(e=>{console.error(e);process.exit(1)});"""
subprocess.run(['node','-e',node,str(root/'brand/inspector-focus-social.png')],input=svg.encode(),check=True)

