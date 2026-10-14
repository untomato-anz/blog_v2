import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";

// Shared by the browser editor and the server renderer so both agree on the schema.
export const baseExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    link: {
      openOnClick: false,
      protocols: ["http", "https", "mailto"],
      HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
    },
  }),
  Image.configure({ allowBase64: false }),
];
