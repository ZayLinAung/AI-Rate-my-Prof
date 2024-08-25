'use client'

import * as React from 'react'
import Textarea from 'react-textarea-autosize'
import { IconArrowElbow, IconRefresh, IconPlus } from '@/components/ui/icons'
import { useEnterSubmit } from '../app/hook/useEnterSubmit'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider
} from '@/components/ui/tooltip'
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from 'react-hot-toast';
import { IconSpinner } from '@/components/ui/icons'


interface URL {
    url: string
}

export function PromptForm({
    input,
    setInput,
    onSubmit
}: {
    input: string
    setInput: (value: string) => void
    onSubmit: (value: string) => Promise<void>

}) {
    const { formRef, onKeyDown } = useEnterSubmit()
    const inputRef = React.useRef<HTMLTextAreaElement>(null)

    React.useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus()
        }
    }, [])

    const handleRefresh = () => {
        setTimeout(() => {
            window.location.reload();
        }, 100);
    };

    const [url, setUrl] = React.useState<URL>({
        url: ""
    });
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);


    // Add professor to pinecone
    const addProfessor = async () => {
        const sublink = "https://www.ratemyprofessors.com/professor/"
        if (!url.url.includes(sublink)) {
            toast.error("Must be valid RateMyProfessor link. Try again.")
            return;
        }
        try {
            setIsLoading(true);
            const response = await fetch("/api/scrape", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(url),
            });

            if (!response.ok) {
                throw new Error('Server responded with an error');
            }

            setUrl({ url: "" });
            toast.success("Successfully added professor!");
            setIsDialogOpen(false);
        } catch (error) {
            console.error('Error adding professor:', error);
            toast.error("Failed to add professor. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <TooltipProvider>
            <form
                ref={formRef}
                onSubmit={async (e: any) => {
                    e.preventDefault()

                    // Blur focus on mobile
                    if (window.innerWidth < 600) {
                        e.target['message']?.blur()
                    }

                    const value = input.trim()
                    setInput('')
                    if (!value) return

                    await onSubmit(value)
                }}
            >
                <div className="relative flex flex-col max-h-60 w-full grow overflow-hidden bg-zinc-100 px-12 sm:rounded-full sm:px-12">
                    {/* Add professor button */}
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                className="absolute left-4 top-[14px] size-8 rounded-full bg-background p-0 sm:left-4"
                                type='button'
                                onClick={() => setIsDialogOpen(true)}
                            >
                                <IconPlus />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Add Professor</DialogTitle>
                                <DialogDescription>
                                    Copy and paste a RateMyProfessor link below
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="username" className="text-right">
                                        Link:
                                    </Label>
                                    <Input
                                        id="username"
                                        defaultValue="@peduarte"
                                        className="col-span-3"
                                        value={url.url}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl({ url: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                {isLoading ? <IconSpinner /> : <Button type="submit" onClick={addProfessor}>Add Professor</Button>
                                }
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Refresh button */}
                    <Button
                        variant="outline"
                        size="icon"
                        className="absolute left-14 top-[14px] size-8 rounded-full bg-background p-0 sm:left-14"
                        type='button'
                        onClick={handleRefresh}
                    >
                        <IconRefresh />
                    </Button>
                    <Textarea
                        ref={inputRef}
                        tabIndex={0}
                        onKeyDown={onKeyDown}
                        placeholder="Send a message."
                        className="min-h-[60px] w-full bg-transparent placeholder:text-zinc-900 resize-none px-14 py-[1.3rem] focus-within:outline-none sm:text-sm"
                        autoFocus
                        spellCheck={false}
                        autoComplete="off"
                        autoCorrect="off"
                        name="message"
                        rows={1}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                    />
                    <div className="absolute right-4 top-[13px] sm:right-4">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="submit"
                                    size="icon"
                                    disabled={input === ''}
                                    className="bg-transparent shadow-none text-zinc-950 rounded-full hover:bg-zinc-200"
                                >
                                    <IconArrowElbow />
                                    <span className="sr-only">Send message</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Send message</TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            </form>
        </TooltipProvider>
    )
}