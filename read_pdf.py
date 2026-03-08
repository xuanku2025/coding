import PyPDF2

def extract_pdf():
    try:
        with open(r'E:\coding\F-虚拟机自定义操作系统-PRD - 虚拟化 - Confluence.pdf', 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for i, page in enumerate(reader.pages):
                text += f"--- Page {i+1} ---\n"
                text += page.extract_text() + "\n"
            
            with open(r'E:\coding\prd_content.txt', 'w', encoding='utf-8') as out:
                out.write(text)
        print("PDF extraction complete.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    extract_pdf()
