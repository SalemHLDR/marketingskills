#!/usr/bin/env python3
import markdown
from weasyprint import HTML

with open("/home/user/marketingskills/audits/libertydebtrelief-marketing-audit.md") as f:
    md_content = f.read()

html_body = markdown.markdown(md_content, extensions=["tables", "fenced_code"])

html_doc = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {{
    size: A4;
    margin: 2cm;
    @bottom-center {{
      content: "Liberty Debt Relief — Marketing Audit — March 2026 | Page " counter(page) " of " counter(pages);
      font-size: 8pt;
      color: #888;
    }}
  }}
  body {{
    font-family: Helvetica, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #1a1a1a;
  }}
  h1 {{
    font-size: 22pt;
    color: #1a3a5c;
    border-bottom: 3px solid #1a3a5c;
    padding-bottom: 8px;
    margin-top: 30px;
  }}
  h2 {{
    font-size: 16pt;
    color: #1a3a5c;
    border-bottom: 1px solid #ccc;
    padding-bottom: 5px;
    margin-top: 25px;
    page-break-after: avoid;
  }}
  h3 {{
    font-size: 13pt;
    color: #2c5f8a;
    margin-top: 18px;
    page-break-after: avoid;
  }}
  table {{
    border-collapse: collapse;
    width: 100%;
    margin: 12px 0;
    font-size: 10pt;
    page-break-inside: avoid;
  }}
  th {{
    background-color: #1a3a5c;
    color: white;
    padding: 8px 10px;
    text-align: left;
    font-weight: 600;
  }}
  td {{
    padding: 6px 10px;
    border-bottom: 1px solid #ddd;
  }}
  tr:nth-child(even) td {{
    background-color: #f7f9fb;
  }}
  strong {{
    color: #1a3a5c;
  }}
  a {{
    color: #2c5f8a;
    text-decoration: none;
  }}
  ul, ol {{
    margin: 8px 0;
    padding-left: 22px;
  }}
  li {{
    margin-bottom: 4px;
  }}
  hr {{
    border: none;
    border-top: 2px solid #1a3a5c;
    margin: 30px 0;
  }}
  code {{
    background-color: #f0f3f6;
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 10pt;
  }}
</style>
</head>
<body>
{html_body}
</body>
</html>"""

output = "/home/user/marketingskills/audits/libertydebtrelief-marketing-audit.pdf"
HTML(string=html_doc).write_pdf(output)
print(f"PDF created: {output}")
