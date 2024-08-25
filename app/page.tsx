"use client";
import { useState, useEffect, useRef, createElement } from "react";
import Markdown from 'react-markdown'
import { useEnterSubmit } from '../app/hook/useEnterSubmit'
import { IconArrowElbow, IconRefresh } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import Textarea from 'react-textarea-autosize'
import { IconUser } from '@/components/ui/icons'
import Image from "next/image";
import { cn } from '@/lib/utils'
import { IconSpinner, IconGemini } from "@/components/ui/icons";
import { PromptForm } from "@/components/PromptForm";
import Professor from "../public/professor.png"
export function TypographyH1() {
  return (
    <div className="flex flex-col sm:flex-row justify-center items-center mt-5 px-4 sm:px-0">
      <Image
        src={Professor}
        width={100}
        height={100}
        alt="Picture of a professor"
        className="p-0 m-0 w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40"
      />
      <h1 className="scroll-m-20 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mt-2 sm:mt-0 sm:ml-4">
        RateMyProfessor
      </h1>
    </div>
  )
}


export default function Home() {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState<number | null>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const [messages, setMessages] = useState([
    {
      role: "model",
      parts: [
        {
          text: `Hi! I'm the Rate My Professor support assistant. How can I help you today?`,
        },
      ],
    },
  ]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // SEND FUNCTION
  const sendMessage = async (messageToSend: string) => {
    setMessage("");
    setMessages((messages) => [
      ...messages,
      { role: "model", parts: [{ text: "" }] },
    ]);

    setLoadingMessageIndex(messages.length + 1);


    const response = fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([...messages, { role: "user", content: messageToSend }]),
    }).then(async (res) => {
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let result = "";

      return reader?.read().then(function processText({ done, value }): any {
        if (done) {
          return result;
        }
        const text = decoder.decode(value || new Uint8Array(), {
          stream: true,
        });
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            {
              ...lastMessage, parts: [
                {
                  text: lastMessage.parts[0].text + text,
                },
              ],
            },
          ];
        });
        setLoadingMessageIndex(null);

        return reader.read().then(processText);
      });
    });
  };

  return (
    <>
      <TypographyH1 />
      {/* Main chat */}
      <div className='min-h-[calc(100vh-200px)] flex flex-col items-center pt-4 '>
        <div ref={messagesContainerRef}
          className='w-full max-w-screen-xs sm:max-w-screen-sm md:max-w-screen-md lg:max-w-screen-lg xl:max-w-screen-xl 2xl:max-w-screen-xl mg-white p-2 rounded-lg max-h-[calc(100vh-300px)] overflow-y-auto hide-scrollbar'>


          <div className="relative mx-auto max-w-3xl grid auto-rows-max gap-8 px-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className="text-left flex"
              >
                <div
                  className={cn(
                    'flex size-7 shrink-0 select-none items-center justify-center rounded-lg border shadow',
                  )}
                >
                  {message.role === 'user' ? <IconUser /> : <IconGemini />}
                </div>
                <div
                  className="px-5 self-center"
                >

                  {index === loadingMessageIndex ? (
                    <IconSpinner />
                  ) : (
                    <>
                      <Markdown>{message.parts[0].text}</Markdown>
                    </>
                  )}
                </div>

              </div>
            ))}
          </div>

        </div>

        {/* Input bar */}
        <div className="sticky top-full sm:w-[640px]">
          <PromptForm
            input={message}
            setInput={setMessage}
            onSubmit={async (value: string) => {
              setMessage('');
              setMessages(prevMessages => [
                ...prevMessages,
                { role: "user", parts: [{ text: value }] },
              ]);
              await sendMessage(value);
            }}
          />
          <span className="mt-2 block text-sm text-gray-500 text-center dark:text-gray-400">© 2023. All Rights Reserved.</span>

        </div>
      </div>
    </>
  );
}
